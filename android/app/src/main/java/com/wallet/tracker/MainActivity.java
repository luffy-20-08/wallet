package com.wallet.tracker;

import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "WalletShare";
    private String pendingSharePayload = null;
    private TextRecognizer textRecognizer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.clearCache(true);
            webView.addJavascriptInterface(new AndroidNativeExportInterface(), "AndroidNativeExport");
        }

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
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidNativeExportInterface(), "AndroidNativeExport");
        }

        if (pendingSharePayload != null) {
            sendSharePayloadToWeb(pendingSharePayload);
            pendingSharePayload = null;
        }
    }

    /**
     * Native Android Export Interface
     * Directly saves generated export files to app cache and triggers Android Chooser
     * with granted read permissions and exact MIME type.
     */
    public class AndroidNativeExportInterface {
        @JavascriptInterface
        public String saveAndShareFile(String fileName, String base64Data, String mimeType, String dialogTitle) {
            try {
                Log.d(TAG, "AndroidNativeExport: saveAndShareFile: " + fileName + ", mime: " + mimeType);
                if (base64Data == null || base64Data.trim().isEmpty()) {
                    return new JSONObject().put("success", false).put("error", "Empty base64 data received").toString();
                }

                String cleanBase64 = base64Data.trim();
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }

                byte[] fileBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                if (fileBytes == null || fileBytes.length == 0) {
                    return new JSONObject().put("success", false).put("error", "Decoded file bytes is 0").toString();
                }

                File cacheDir = getCacheDir();
                File exportDir = new File(cacheDir, "exports");
                if (!exportDir.exists()) {
                    exportDir.mkdirs();
                }

                File outFile = new File(exportDir, fileName);
                FileOutputStream fos = new FileOutputStream(outFile);
                fos.write(fileBytes);
                fos.flush();
                fos.close();

                Log.i(TAG, "AndroidNativeExport: Saved " + outFile.length() + " bytes to " + outFile.getAbsolutePath());

                Uri contentUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    outFile
                );

                Log.i(TAG, "AndroidNativeExport: FileProvider content URI: " + contentUri);

                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                String resolvedMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType.trim() : "application/pdf";
                sendIntent.setType(resolvedMime);
                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, fileName);
                sendIntent.setClipData(ClipData.newRawUri(fileName, contentUri));
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(sendIntent, dialogTitle != null ? dialogTitle : "Export: " + fileName);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                // Grant explicit URI read permissions to all apps matching the chooser
                List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    String targetPackage = resolveInfo.activityInfo.packageName;
                    grantUriPermission(targetPackage, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                startActivity(chooser);

                JSONObject res = new JSONObject();
                res.put("success", true);
                res.put("uri", contentUri.toString());
                res.put("path", outFile.getAbsolutePath());
                res.put("size", outFile.length());
                return res.toString();
            } catch (Exception e) {
                Log.e(TAG, "AndroidNativeExport exception", e);
                try {
                    return new JSONObject().put("success", false).put("error", e.getMessage() != null ? e.getMessage() : e.toString()).toString();
                } catch (Exception ignored) {
                    return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
                }
            }
        }
    }
}
