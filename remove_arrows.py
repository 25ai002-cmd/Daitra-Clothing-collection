"""
Remove carousel navigation arrows (< >) from all dress images.
Uses a robust, visual-quality-preserving horizontal band interpolation at the vertical center.
"""

from PIL import Image
import os
import sys
import numpy as np

DRESSES_FOLDER = r"c:\Users\301461\Desktop\web\dresses"
PUBLIC_FOLDER  = r"c:\Users\301461\Desktop\web\public\dresses"

def remove_arrows_from_image(img_path):
    img = Image.open(img_path).convert("RGB")
    arr = np.array(img)
    h, w = arr.shape[:2]
    
    # Only process standard/large images that actually contain the carousel arrows
    # Narrow or thumbnail-sized images (width <= 450) do not have arrows.
    if w <= 450 or h <= 450:
        return False, "skipped (too small)"
        
    cy = h // 2
    # Vertical range for the arrow buttons
    y_start = cy - 28
    y_end = cy + 28
    
    # Horizontal range width (38px covers the circle + drop shadow perfectly)
    band_w = 38
    
    # Interpolate left and right bands
    for y in range(y_start, y_end + 1):
        if y < 0 or y >= h:
            continue
            
        # Left side (columns 0 to band_w)
        left_val = arr[y, 0].astype(float)
        right_val_left = arr[y, band_w].astype(float)
        for x in range(0, band_w + 1):
            t = x / float(band_w)
            arr[y, x] = ((1.0 - t) * left_val + t * right_val_left).astype(np.uint8)
            
        # Right side (columns w - band_w to w - 1)
        left_val_right = arr[y, w - band_w - 1].astype(float)
        right_val = arr[y, w - 1].astype(float)
        for x in range(w - band_w - 1, w):
            t = (x - (w - band_w - 1)) / float(band_w)
            arr[y, x] = ((1.0 - t) * left_val_right + t * right_val).astype(np.uint8)
            
    out_img = Image.fromarray(arr)
    out_img.save(img_path, "JPEG", quality=95, optimize=True)
    return True, "processed"

def process_folder(folder):
    files = sorted([f for f in os.listdir(folder)
                    if f.lower().endswith(".jpg") and not f.endswith("_orig.jpg") and not f.endswith("_test.jpg") and f != "imp.jpg"])
    total = len(files)
    processed = 0
    skipped = 0
    
    for i, fname in enumerate(files, 1):
        fpath = os.path.join(folder, fname)
        try:
            success, status = remove_arrows_from_image(fpath)
            if success:
                processed += 1
                marker = "V"
            else:
                skipped += 1
                marker = "."
            sys.stdout.write(f"\r  [{i:3d}/{total}] {marker} {fname} ({status})        ")
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(f"\n  ERROR {fname}: {e}\n")
            sys.stdout.flush()
            
    print(f"\n  Done: {processed} processed, {skipped} skipped, {total} total")

if __name__ == "__main__":
    print("=== Removing carousel arrows from all dress images ===")
    
    print("\n[1/2] Processing dresses/ folder...")
    process_folder(DRESSES_FOLDER)
    
    print("\n[2/2] Processing public/dresses/ folder...")
    process_folder(PUBLIC_FOLDER)
    
    print("\nDone!")
