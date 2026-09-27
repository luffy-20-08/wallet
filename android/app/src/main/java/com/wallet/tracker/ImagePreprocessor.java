package com.wallet.tracker;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.media.ExifInterface;
import android.net.Uri;
import android.util.Base64;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * ImagePreprocessor handles high-fidelity image decoding, EXIF rotation correction,
 * and multi-pass OCR image variants (original normalized, high-contrast grayscale,
 * and central payment region crop).
 */
public class ImagePreprocessor {
    private static final String TAG = "WalletImgPreproc";
    public static final int DEFAULT_MAX_DIMENSION = 2560; // Keep sharp resolution for OCR

    /**
     * Decodes an image from URI at maximum available resolution and corrects orientation.
     */
    public static Bitmap decodeAndNormalizeBitmap(Context context, Uri uri, int maxDimension) {
        if (context == null || uri == null) return null;

        InputStream isForBounds = null;
        InputStream isForExif = null;
        InputStream isForDecode = null;

        try {
            // 1. Read EXIF Orientation
            int rotationAngle = 0;
            try {
                isForExif = context.getContentResolver().openInputStream(uri);
                if (isForExif != null) {
                    ExifInterface exif = new ExifInterface(isForExif);
                    int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                    if (orientation == ExifInterface.ORIENTATION_ROTATE_90) {
                        rotationAngle = 90;
                    } else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) {
                        rotationAngle = 180;
                    } else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) {
                        rotationAngle = 270;
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Could not determine EXIF orientation, proceeding with normal orientation", e);
            } finally {
                if (isForExif != null) {
                    try { isForExif.close(); } catch (Exception ignored) {}
                }
            }

            // 2. Read dimensions without allocating full pixel memory
            BitmapFactory.Options boundsOptions = new BitmapFactory.Options();
            boundsOptions.inJustDecodeBounds = true;
            isForBounds = context.getContentResolver().openInputStream(uri);
            BitmapFactory.decodeStream(isForBounds, null, boundsOptions);
            if (isForBounds != null) isForBounds.close();

            int rawWidth = boundsOptions.outWidth;
            int rawHeight = boundsOptions.outHeight;

            if (rawWidth <= 0 || rawHeight <= 0) {
                Log.e(TAG, "Invalid bitmap dimensions returned: " + rawWidth + "x" + rawHeight);
                return null;
            }

            // 3. Compute inSampleSize to avoid OOM while preserving high resolution
            int inSampleSize = 1;
            int longestDim = Math.max(rawWidth, rawHeight);
            while (longestDim / (inSampleSize * 2) >= maxDimension) {
                inSampleSize *= 2;
            }

            BitmapFactory.Options decodeOptions = new BitmapFactory.Options();
            decodeOptions.inSampleSize = inSampleSize;
            decodeOptions.inPreferredConfig = Bitmap.Config.ARGB_8888;

            isForDecode = context.getContentResolver().openInputStream(uri);
            Bitmap decodedBitmap = BitmapFactory.decodeStream(isForDecode, null, decodeOptions);

            if (decodedBitmap == null) {
                Log.e(TAG, "BitmapFactory.decodeStream failed to decode bitmap");
                return null;
            }

            // 4. Apply rotation if needed
            if (rotationAngle != 0) {
                Matrix matrix = new Matrix();
                matrix.postRotate(rotationAngle);
                Bitmap rotated = Bitmap.createBitmap(
                        decodedBitmap, 0, 0,
                        decodedBitmap.getWidth(), decodedBitmap.getHeight(),
                        matrix, true
                );
                if (rotated != decodedBitmap) {
                    decodedBitmap.recycle();
                    decodedBitmap = rotated;
                }
            }

            Log.i(TAG, "Decoded normalized bitmap: " + decodedBitmap.getWidth() + "x" + decodedBitmap.getHeight() + ", rotation=" + rotationAngle);
            return decodedBitmap;

        } catch (Exception e) {
            Log.e(TAG, "Failed to decode and normalize bitmap from URI: " + uri, e);
            return null;
        } finally {
            try { if (isForBounds != null) isForBounds.close(); } catch (Exception ignored) {}
            try { if (isForDecode != null) isForDecode.close(); } catch (Exception ignored) {}
        }
    }

    /**
     * PASS 2 Preprocessing: Converts to high-contrast grayscale.
     * Enhances faint numbers, removes color gradient distractions,
     * and boosts OCR edge definition for dark-mode and light-mode receipts.
     */
    public static Bitmap createHighContrastGrayscaleBitmap(Bitmap src) {
        if (src == null || src.isRecycled()) return null;

        try {
            int width = src.getWidth();
            int height = src.getHeight();

            Bitmap output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(output);
            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);

            // Grayscale saturation 0
            ColorMatrix colorMatrix = new ColorMatrix();
            colorMatrix.setSaturation(0);

            // Contrast enhancement factor: 1.4x
            float contrast = 1.4f;
            float translate = (-0.5f * contrast + 0.5f) * 255f;
            ColorMatrix contrastMatrix = new ColorMatrix(new float[] {
                contrast, 0, 0, 0, translate,
                0, contrast, 0, 0, translate,
                0, 0, contrast, 0, translate,
                0, 0, 0, 1, 0
            });

            colorMatrix.postConcat(contrastMatrix);
            paint.setColorFilter(new ColorMatrixColorFilter(colorMatrix));
            canvas.drawBitmap(src, 0, 0, paint);

            return output;
        } catch (Exception e) {
            Log.e(TAG, "Failed to create high-contrast grayscale bitmap", e);
            return null;
        }
    }

    /**
     * PASS 3 Preprocessing: Crops the central payment details region
     * Removes top notification bar (clock, battery, icons) and bottom navigation bar.
     */
    public static Bitmap createPaymentAreaCroppedBitmap(Bitmap src) {
        if (src == null || src.isRecycled()) return null;

        try {
            int width = src.getWidth();
            int height = src.getHeight();

            // Only crop if portrait screenshot
            if (height > width * 1.25) {
                int topCrop = (int) (height * 0.08); // Skip status bar
                int bottomCrop = (int) (height * 0.88); // Skip bottom navigation bar
                int croppedHeight = bottomCrop - topCrop;

                if (croppedHeight > 200 && topCrop < height) {
                    return Bitmap.createBitmap(src, 0, topCrop, width, croppedHeight);
                }
            }
            return null;
        } catch (Exception e) {
            Log.e(TAG, "Failed to create cropped payment region bitmap", e);
            return null;
        }
    }

    /**
     * Converts a bitmap to a base64 JPEG data URL for display and receipt storage.
     */
    public static String bitmapToBase64Jpeg(Bitmap bitmap, int quality) {
        if (bitmap == null || bitmap.isRecycled()) return "";
        try {
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.JPEG, Math.max(50, Math.min(quality, 95)), outputStream);
            byte[] bytes = outputStream.toByteArray();
            return "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception e) {
            Log.e(TAG, "Failed to compress bitmap to base64 JPEG", e);
            return "";
        }
    }
}
