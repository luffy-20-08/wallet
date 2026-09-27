package com.wallet.tracker;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.net.Uri;
import android.util.Log;

import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * OcrPipeline manages ML Kit Text Recognition with intelligent multi-pass execution,
 * spatial bounding-box extraction, and candidate cross-validation.
 */
public class OcrPipeline {
    private static final String TAG = "WalletOcrPipeline";

    public interface OcrCallback {
        void onCompleted(JSONObject richPayload);
        void onError(Exception error);
    }

    private final Context context;
    private final TextRecognizer textRecognizer;
    private final ExecutorService executorService;

    // Fast heuristic patterns to evaluate if Pass 1 is already confident
    private static final Pattern PATTERN_AMOUNT = Pattern.compile("(?:[₹]|Rs\\.?|INR)\\s*\\d+(?:[.,]\\d+)?", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_DATE = Pattern.compile("(?:\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}|\\d{1,2}\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{4})", Pattern.CASE_INSENSITIVE);
    private static final Pattern PATTERN_PAYEE = Pattern.compile("(?:paid\\s+to|payment\\s+to|sent\\s+to|banking\\s+name)", Pattern.CASE_INSENSITIVE);

    public OcrPipeline(Context context) {
        this.context = context.getApplicationContext();
        this.textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        this.executorService = Executors.newSingleThreadExecutor();
    }

    /**
     * Process a shared payment screenshot with the multi-pass pipeline.
     */
    public void processScreenshot(final Uri imageUri, final String accompanyingText, final OcrCallback callback) {
        executorService.execute(() -> {
            Bitmap originalBitmap = null;
            Bitmap highContrastBitmap = null;
            Bitmap croppedBitmap = null;

            try {
                Log.i(TAG, "Starting multi-pass OCR pipeline for URI: " + imageUri);

                // -------------------------------------------------------------
                // 1. DECODE & NORMALIZE ORIGINAL BITMAP
                // -------------------------------------------------------------
                originalBitmap = ImagePreprocessor.decodeAndNormalizeBitmap(
                        context, imageUri, ImagePreprocessor.DEFAULT_MAX_DIMENSION
                );

                if (originalBitmap == null) {
                    throw new IllegalStateException("Failed to decode screenshot from URI: " + imageUri);
                }

                int imgWidth = originalBitmap.getWidth();
                int imgHeight = originalBitmap.getHeight();

                // Generate base64 JPEG from original for receipt preview and attachment
                String base64Image = ImagePreprocessor.bitmapToBase64Jpeg(originalBitmap, 85);

                // PRIVACY REQUIREMENT: Generate neutral Wallet-controlled filename
                // MUST NEVER be derived from OCR content (no merchant, amount, UTR, etc.)
                String neutralFileName = ImagePreprocessor.generateNeutralAttachmentFileName("png");
                File privateAttachment = ImagePreprocessor.savePrivateAttachmentCopy(context, originalBitmap, neutralFileName);

                List<Text> passResults = new ArrayList<>();
                List<Integer> passesRun = new ArrayList<>();

                // -------------------------------------------------------------
                // PASS 1: High-Resolution Normalized Image
                // -------------------------------------------------------------
                InputImage pass1Image = InputImage.fromBitmap(originalBitmap, 0);
                Task<Text> pass1Task = textRecognizer.process(pass1Image);
                Text pass1Text = Tasks.await(pass1Task);
                passResults.add(pass1Text);
                passesRun.add(1);

                String rawTextPass1 = pass1Text != null ? pass1Text.getText() : "";
                Log.d(TAG, "Pass 1 Completed. Characters extracted: " + rawTextPass1.length());

                // Check Pass 1 confidence heuristics
                boolean hasAmount = PATTERN_AMOUNT.matcher(rawTextPass1).find();
                boolean hasDate = PATTERN_DATE.matcher(rawTextPass1).find();
                boolean hasPayee = PATTERN_PAYEE.matcher(rawTextPass1).find();

                boolean pass1HighConfidence = hasAmount && hasDate && hasPayee;
                Log.i(TAG, "Pass 1 Confidence Assessment: amount=" + hasAmount + ", date=" + hasDate + ", payee=" + hasPayee + " -> HighConfidence=" + pass1HighConfidence);

                // -------------------------------------------------------------
                // PASS 2: High-Contrast Grayscale (if needed)
                // -------------------------------------------------------------
                if (!pass1HighConfidence) {
                    Log.i(TAG, "Pass 1 confidence incomplete. Executing Pass 2 (High-Contrast Grayscale)...");
                    highContrastBitmap = ImagePreprocessor.createHighContrastGrayscaleBitmap(originalBitmap);
                    if (highContrastBitmap != null) {
                        InputImage pass2Image = InputImage.fromBitmap(highContrastBitmap, 0);
                        Task<Text> pass2Task = textRecognizer.process(pass2Image);
                        Text pass2Text = Tasks.await(pass2Task);
                        passResults.add(pass2Text);
                        passesRun.add(2);

                        String rawTextPass2 = pass2Text != null ? pass2Text.getText() : "";
                        Log.d(TAG, "Pass 2 Completed. Characters extracted: " + rawTextPass2.length());

                        // Re-evaluate if still missing Date or Amount
                        boolean pass2HasDate = PATTERN_DATE.matcher(rawTextPass2).find();
                        boolean pass2HasAmount = PATTERN_AMOUNT.matcher(rawTextPass2).find();

                        // -------------------------------------------------------------
                        // PASS 3: Central Payment Region Crop (if still missing critical data)
                        // -------------------------------------------------------------
                        if (!hasDate && !pass2HasDate && (!hasAmount && !pass2HasAmount)) {
                            Log.i(TAG, "Critical fields still missing. Executing Pass 3 (Central Crop)...");
                            croppedBitmap = ImagePreprocessor.createPaymentAreaCroppedBitmap(originalBitmap);
                            if (croppedBitmap != null) {
                                InputImage pass3Image = InputImage.fromBitmap(croppedBitmap, 0);
                                Task<Text> pass3Task = textRecognizer.process(pass3Image);
                                Text pass3Text = Tasks.await(pass3Task);
                                passResults.add(pass3Text);
                                passesRun.add(3);
                                Log.d(TAG, "Pass 3 Completed.");
                            }
                        }
                    }
                }

                // -------------------------------------------------------------
                // STRUCTURED SPATIAL EXTRACTION
                // -------------------------------------------------------------
                JSONObject structuredPayload = new JSONObject();
                structuredPayload.put("type", "image");
                structuredPayload.put("imageBase64", base64Image);
                structuredPayload.put("attachmentFileName", neutralFileName);
                if (privateAttachment != null) {
                    structuredPayload.put("attachmentPath", privateAttachment.getAbsolutePath());
                }
                structuredPayload.put("source", "android_mlkit_ocr");
                structuredPayload.put("timestamp", System.currentTimeMillis());
                structuredPayload.put("accompanyingText", accompanyingText != null ? accompanyingText : "");

                JSONArray passesArray = new JSONArray();
                for (int passNum : passesRun) {
                    passesArray.put(passNum);
                }
                structuredPayload.put("passesRun", passesArray);

                JSONObject spatialData = new JSONObject();
                spatialData.put("imageWidth", imgWidth);
                spatialData.put("imageHeight", imgHeight);

                // Collect combined raw text across passes without duplicate lines
                StringBuilder combinedRawText = new StringBuilder();
                if (accompanyingText != null && !accompanyingText.trim().isEmpty()) {
                    combinedRawText.append(accompanyingText.trim()).append("\n\n");
                }

                JSONArray linesJsonArray = new JSONArray();
                JSONArray blocksJsonArray = new JSONArray();

                // Process Pass 1 first (primary geometric reference)
                if (!passResults.isEmpty() && passResults.get(0) != null) {
                    Text primaryText = passResults.get(0);
                    combinedRawText.append(primaryText.getText());

                    for (Text.TextBlock block : primaryText.getTextBlocks()) {
                        JSONObject blockJson = new JSONObject();
                        blockJson.put("text", block.getText());
                        Rect bBox = block.getBoundingBox();
                        if (bBox != null) {
                            blockJson.put("left", bBox.left);
                            blockJson.put("top", bBox.top);
                            blockJson.put("right", bBox.right);
                            blockJson.put("bottom", bBox.bottom);
                            blockJson.put("width", bBox.width());
                            blockJson.put("height", bBox.height());
                            blockJson.put("relTop", (double) bBox.top / imgHeight);
                            blockJson.put("relBottom", (double) bBox.bottom / imgHeight);
                            blockJson.put("relLeft", (double) bBox.left / imgWidth);
                            blockJson.put("relRight", (double) bBox.right / imgWidth);
                        }

                        for (Text.Line line : block.getLines()) {
                            JSONObject lineJson = new JSONObject();
                            lineJson.put("text", line.getText());
                            lineJson.put("pass", 1);
                            Rect lBox = line.getBoundingBox();
                            if (lBox != null) {
                                lineJson.put("left", lBox.left);
                                lineJson.put("top", lBox.top);
                                lineJson.put("right", lBox.right);
                                lineJson.put("bottom", lBox.bottom);
                                lineJson.put("width", lBox.width());
                                lineJson.put("height", lBox.height());
                                lineJson.put("relTop", (double) lBox.top / imgHeight);
                                lineJson.put("relBottom", (double) lBox.bottom / imgHeight);
                                lineJson.put("relLeft", (double) lBox.left / imgWidth);
                                lineJson.put("relHeight", (double) lBox.height() / imgHeight);
                            }
                            linesJsonArray.put(lineJson);
                        }
                        blocksJsonArray.put(blockJson);
                    }
                }

                // If Pass 2 ran, append any new lines or variants
                if (passResults.size() > 1 && passResults.get(1) != null) {
                    Text pass2 = passResults.get(1);
                    combinedRawText.append("\n--- PASS 2 (HIGH CONTRAST) ---\n").append(pass2.getText());
                    for (Text.TextBlock block : pass2.getTextBlocks()) {
                        for (Text.Line line : block.getLines()) {
                            JSONObject lineJson = new JSONObject();
                            lineJson.put("text", line.getText());
                            lineJson.put("pass", 2);
                            Rect lBox = line.getBoundingBox();
                            if (lBox != null) {
                                lineJson.put("top", lBox.top);
                                lineJson.put("bottom", lBox.bottom);
                                lineJson.put("relTop", (double) lBox.top / imgHeight);
                                lineJson.put("relHeight", (double) lBox.height() / imgHeight);
                            }
                            linesJsonArray.put(lineJson);
                        }
                    }
                }

                spatialData.put("lines", linesJsonArray);
                spatialData.put("blocks", blocksJsonArray);

                structuredPayload.put("text", combinedRawText.toString());
                structuredPayload.put("spatialData", spatialData);

                Log.i(TAG, "OCR Pipeline completed successfully. Lines extracted: " + linesJsonArray.length() + ", Passes: " + passesRun);

                callback.onCompleted(structuredPayload);

            } catch (Exception e) {
                Log.e(TAG, "OCR Pipeline error", e);
                callback.onError(e);
            } finally {
                // Free memory for high-contrast and cropped bitmaps
                if (highContrastBitmap != null && !highContrastBitmap.isRecycled()) {
                    highContrastBitmap.recycle();
                }
                if (croppedBitmap != null && !croppedBitmap.isRecycled()) {
                    croppedBitmap.recycle();
                }
            }
        });
    }

    public void shutdown() {
        if (textRecognizer != null) {
            textRecognizer.close();
        }
        if (executorService != null) {
            executorService.shutdown();
        }
    }
}
