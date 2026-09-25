package com.wallet.tracker;

import android.content.ClipData;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "WalletShare";
    private String pendingSharePayload = null;
    private TextRecognizer textRecognizer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        Intent intent = getIntent();
        if (intent != null) {
            handleIncomingIntent(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null) {
            handleIncomingIntent(intent);
        }
    }

    /**
     * Inspect intent and extract shared text or shared payment screenshot
     */
    private void handleIncomingIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (!Intent.ACTION_SEND.equals(action) || type == null) {
            return;
        }

        Log.d(TAG, "Incoming Share Intent: action=" + action + ", type=" + type);

        if (type.startsWith("text/")) {
            handleSharedText(intent);
        } else if (type.startsWith("image/")) {
            handleSharedImage(intent);
        }
    }

    /**
     * Handle incoming shared text (e.g. PhonePe transaction completion share)
     */
    private void handleSharedText(Intent intent) {
        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        String sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);

        if (sharedText == null || sharedText.trim().isEmpty()) {
            CharSequence textChars = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (textChars != null) {
                sharedText = textChars.toString();
            }
        }

        if (sharedText == null || sharedText.trim().isEmpty()) {
            ClipData clipData = intent.getClipData();
            if (clipData != null && clipData.getItemCount() > 0) {
                CharSequence textChars = clipData.getItemAt(0).getText();
                if (textChars != null) {
                    sharedText = textChars.toString();
                }
            }
        }

        if (sharedText == null) sharedText = "";

        Log.i(TAG, "=== RAW SHARED TEXT RECEIVED ===\n" + sharedText + "\n=== END RAW SHARED TEXT ===");

        try {
            JSONObject payload = new JSONObject();
            payload.put("type", "text");
            payload.put("text", sharedText);
            payload.put("subject", sharedSubject != null ? sharedSubject : "");
            payload.put("source", "android_share_intent");
            payload.put("timestamp", System.currentTimeMillis());

            sendSharePayloadToWeb(payload.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error constructing text payload", e);
        }
    }

    /**
     * Handle incoming payment screenshot/image (Runs Google ML Kit OCR and extracts base64)
     */
    private void handleSharedImage(Intent intent) {
        Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);

        // Also check if any text/caption was shared alongside the image
        String accompanyingText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (accompanyingText == null || accompanyingText.trim().isEmpty()) {
            CharSequence textChars = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (textChars != null) accompanyingText = textChars.toString();
        }

        if (imageUri == null) {
            ClipData clipData = intent.getClipData();
            if (clipData != null && clipData.getItemCount() > 0) {
                imageUri = clipData.getItemAt(0).getUri();
            }
        }

        if (imageUri == null) {
            Log.w(TAG, "No image URI found in ACTION_SEND intent");
            if (accompanyingText != null && !accompanyingText.trim().isEmpty()) {
                Log.i(TAG, "Falling back to accompanying text from intent");
                handleSharedText(intent);
            }
            return;
        }

        final Uri finalUri = imageUri;
        final String finalAccompanyingText = accompanyingText != null ? accompanyingText.trim() : "";

        Log.i(TAG, "Processing shared image URI: " + finalUri + ", Accompanying Text: " + finalAccompanyingText);

        // Run in background thread to avoid blocking UI during bitmap decode & OCR
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    InputStream inputStream = getContentResolver().openInputStream(finalUri);
                    Bitmap originalBitmap = BitmapFactory.decodeStream(inputStream);
                    if (inputStream != null) inputStream.close();

                    if (originalBitmap == null) {
                        Log.e(TAG, "Failed to decode bitmap from URI: " + finalUri);
                        if (!finalAccompanyingText.isEmpty()) {
                            deliverImagePayload(finalAccompanyingText, null);
                        }
                        return;
                    }

                    // Scale down if image is huge to avoid OOM and keep base64 lightweight
                    int maxDimension = 1400;
                    int width = originalBitmap.getWidth();
                    int height = originalBitmap.getHeight();
                    Bitmap processedBitmap = originalBitmap;

                    if (width > maxDimension || height > maxDimension) {
                        float scale = Math.min((float) maxDimension / width, (float) maxDimension / height);
                        int newWidth = Math.round(width * scale);
                        int newHeight = Math.round(height * scale);
                        processedBitmap = Bitmap.createScaledBitmap(originalBitmap, newWidth, newHeight, true);
                    }

                    // Convert to Base64 JPEG data URL for preview and receipt attachment
                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    processedBitmap.compress(Bitmap.CompressFormat.JPEG, 85, outputStream);
                    byte[] imageBytes = outputStream.toByteArray();
                    final String base64Image = "data:image/jpeg;base64," + Base64.encodeToString(imageBytes, Base64.NO_WRAP);

                    // Run Google ML Kit On-Device Text Recognition
                    InputImage image = InputImage.fromBitmap(processedBitmap, 0);
                    textRecognizer.process(image)
                            .addOnSuccessListener(visionText -> {
                                String ocrExtractedText = visionText != null ? visionText.getText() : "";
                                Log.i(TAG, "=== ML KIT OCR EXTRACTED TEXT ===\n" + ocrExtractedText + "\n=== END OCR TEXT ===");

                                StringBuilder combinedText = new StringBuilder();
                                if (!finalAccompanyingText.isEmpty()) {
                                    combinedText.append(finalAccompanyingText).append("\n");
                                }
                                if (ocrExtractedText != null && !ocrExtractedText.trim().isEmpty()) {
                                    combinedText.append(ocrExtractedText.trim());
                                }

                                deliverImagePayload(combinedText.toString(), base64Image);
                            })
                            .addOnFailureListener(e -> {
                                Log.e(TAG, "ML Kit OCR failed, delivering image with accompanying text if any", e);
                                deliverImagePayload(finalAccompanyingText, base64Image);
                            });

                } catch (Exception e) {
                    Log.e(TAG, "Error processing shared image", e);
                }
            }
        }).start();
    }

    private void deliverImagePayload(String ocrText, String base64Image) {
        try {
            JSONObject payload = new JSONObject();
            payload.put("type", "image");
            payload.put("text", ocrText != null ? ocrText : "");
            payload.put("imageBase64", base64Image != null ? base64Image : "");
            payload.put("source", "android_share_intent");
            payload.put("timestamp", System.currentTimeMillis());

            sendSharePayloadToWeb(payload.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error packaging image payload", e);
        }
    }

    /**
     * Deliver JSON payload to Wallet JavaScript application via evaluateJavascript
     */
    private void sendSharePayloadToWeb(final String jsonPayload) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        // Deliver directly to window.handleWalletShareIntent or queue in window.__pendingShareIntent
                        String script = "if (window.handleWalletShareIntent && document.getElementById('import-amount')) { " +
                                "    window.handleWalletShareIntent(" + jsonPayload + "); " +
                                "} else { " +
                                "    window.__pendingShareIntent = " + jsonPayload + "; " +
                                "}";
                        webView.evaluateJavascript(script, new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                Log.d(TAG, "Share payload delivered to WebView: " + value);
                            }
                        });
                    } else {
                        // Store pending payload if webview is not ready yet
                        pendingSharePayload = jsonPayload;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error delivering share payload to web", e);
                    pendingSharePayload = jsonPayload;
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingSharePayload != null) {
            sendSharePayloadToWeb(pendingSharePayload);
            pendingSharePayload = null;
        }
    }
}
