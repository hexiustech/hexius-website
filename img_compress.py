from PIL import Image
import argparse
import os
import shutil
from pathlib import Path

def compress_image(input_path, output_path, quality=85, max_size=None, target_kb=800):
    """
    Compress a single image file.
    
    Args:
        input_path: Path to input image
        output_path: Path to save compressed image
        quality: Starting JPEG quality (1-100)
        max_size: Optional tuple (width, height) to resize images
        target_kb: Target max file size in KB
        
    Returns:
        Tuple of (success, original_size, compressed_size)
    """
    target_bytes = target_kb * 1024
    temp_path = str(output_path) + ".tmp"
    
    try:
        original_size = os.path.getsize(input_path)
        
        with Image.open(input_path) as img:
            original_width, original_height = img.size
            current_quality = quality
            scale_factor = 1.0
            
            # Convert RGBA to RGB for JPG (if needed)
            if img.mode == 'RGBA' and str(input_path).lower().endswith(('.jpg', '.jpeg')):
                img = img.convert('RGB')
            
            # Try compressing with progressively lower quality/size
            attempts = 0
            max_attempts = 20
            
            while attempts < max_attempts:
                img_copy = img.copy()
                
                # Apply resizing if needed
                if scale_factor < 1.0 or max_size:
                    new_width = int(original_width * scale_factor)
                    new_height = int(original_height * scale_factor)
                    
                    if max_size:
                        new_width = min(new_width, max_size[0])
                        new_height = min(new_height, max_size[1])
                    
                    img_copy.thumbnail((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Save with current settings (format from output path)
                output_ext = Path(output_path).suffix.lower()
                if output_ext == '.webp':
                    img_copy.save(temp_path, 'WEBP', quality=current_quality, optimize=True)
                elif str(input_path).lower().endswith('.png'):
                    img_copy.save(temp_path, 'PNG', optimize=True)
                else:
                    img_copy.save(temp_path, 'JPEG', quality=current_quality, optimize=True)
                
                compressed_size = os.path.getsize(temp_path)
                
                # Check if we're under target
                if compressed_size <= target_bytes:
                    break
                
                # Adjust settings for next attempt
                attempts += 1
                if current_quality > 60:
                    current_quality -= 5
                else:
                    scale_factor *= 0.9
            
            compressed_size = os.path.getsize(temp_path)
            
            # Move temp to final output
            os.replace(temp_path, output_path)
            
            return True, original_size, compressed_size
            
    except Exception as e:
        print(f"✗ Error processing {input_path}: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False, 0, 0


def compress_images(input_path, output_dir=None, quality=85, max_size=None, target_kb=800, suffix="_compressed", recursive=False, in_place=False, to_webp=False, backup_dir=None, backup_base=None):
    """
    Compress image(s) - handles both single files and directories.

    Args:
        input_path: Path to image file or directory
        output_dir: Output directory (if None, saves in same dir with suffix)
        quality: Starting JPEG quality (1-100, default 85)
        max_size: Optional tuple (width, height) to resize images
        target_kb: Target max file size in KB (default 800)
        suffix: Suffix to add to filename if output_dir is None (default "_compressed")
        recursive: If True and input is a directory, process all images in subdirectories
        in_place: If True, overwrite each file with its compressed version (keeps names)
        to_webp: If True, output as WebP (same quality/size logic); originals are kept
        backup_dir: If set, copy originals here before conversion (preserves path structure)
    """
    input_path = Path(input_path)
    
    # Check if input exists
    if not input_path.exists():
        print(f"Error: {input_path} does not exist")
        return
    
    # Supported image extensions
    extensions = ('.png', '.jpg', '.jpeg', '.PNG', '.JPG', '.JPEG')
    
    # Collect image files to process
    if input_path.is_file():
        if input_path.suffix.lower() in [e.lower() for e in extensions]:
            image_files = [input_path]
        else:
            print(f"Error: {input_path} is not a supported image format")
            return
    else:
        if recursive:
            image_files = [f for f in input_path.rglob("*")
                          if f.is_file() and f.suffix in extensions]
        else:
            image_files = [f for f in input_path.iterdir()
                          if f.is_file() and f.suffix in extensions]

    if not image_files:
        print(f"No images found in {input_path}")
        return

    if in_place:
        print("Compressing in place (overwriting originals)...")
    if to_webp:
        print("Output format: WebP (same quality/size logic; originals kept).")
    if backup_dir:
        print(f"Backing up originals to {backup_dir}")
    print(f"Found {len(image_files)} image(s) to compress")
    print(f"Target size: {target_kb}KB\n")

    # Process each image
    for img_file in image_files:
        stem = img_file.stem
        # Determine output path
        if in_place:
            output_path = img_file
        elif output_dir:
            output_dir_path = Path(output_dir)
            output_dir_path.mkdir(parents=True, exist_ok=True)
            output_path = output_dir_path / img_file.name
        else:
            # Add suffix to filename in same directory
            ext = img_file.suffix
            output_path = img_file.parent / f"{stem}{suffix}{ext}"
        if to_webp:
            if in_place:
                output_path = img_file.parent / (stem + ".webp")
            elif output_dir:
                output_path = output_dir_path / (stem + ".webp")
            else:
                output_path = img_file.parent / f"{stem}{suffix}.webp"

        # Backup original before conversion (preserves directory structure)
        if backup_dir and to_webp:
            try:
                base = Path(backup_base).resolve() if backup_base else (input_path if input_path.is_dir() else input_path.parent).resolve()
                img_resolved = img_file.resolve()
                rel = img_resolved.relative_to(base)
                backup_path = Path(backup_dir).resolve() / rel
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(img_file, backup_path)
            except Exception as e:
                print(f"   ⚠ Backup failed for {img_file}: {e}")

        # Compress the image
        success, original_size, compressed_size = compress_image(
            img_file, output_path, quality, max_size, target_kb
        )
        
        if success:
            reduction = ((original_size - compressed_size) / original_size) * 100
            status = "✓" if compressed_size <= target_kb * 1024 else "⚠"
            print(f"{status} {img_file.name} → {output_path.name}")
            print(f"   {original_size/1024:.1f}KB → {compressed_size/1024:.1f}KB ({reduction:.1f}% reduction)")
            if compressed_size > target_kb * 1024:
                print(f"   ⚠ Still above target ({compressed_size/1024:.1f}KB > {target_kb}KB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Compress PNG/JPEG images. Use --all-assets to compress all images under assets/images in place."
    )
    parser.add_argument(
        "--all-assets",
        action="store_true",
        help="Recursively compress all images in assets/images, overwriting originals (keeps filenames for the website).",
    )
    parser.add_argument(
        "--path",
        default="./assets/images",
        help="Root path for --all-assets (default: ./assets/images).",
    )
    parser.add_argument(
        "--webp",
        action="store_true",
        help="Convert output to WebP (same quality/size logic). Originals are kept.",
    )
    parser.add_argument(
        "--backup",
        action="store_true",
        help="Copy originals to assets/backup/ before conversion (preserves path structure).",
    )
    parser.add_argument(
        "--backup-dir",
        metavar="PATH",
        help="Custom backup directory (overrides default when used with --backup).",
    )
    args = parser.parse_args()

    backup_dir = None
    if args.backup:
        backup_dir = args.backup_dir if args.backup_dir else str(Path(args.path).parent / "backup")

    if args.all_assets:
        # When backing up a subdir, use parent as base so full path (e.g. history/2025/) is preserved
        backup_base = str(Path(args.path).parent) if backup_dir and Path(args.path).name != "images" else None
        compress_images(
            args.path,
            recursive=True,
            in_place=True,
            to_webp=args.webp,
            backup_dir=backup_dir,
            backup_base=backup_base,
        )
    else:
        parser.print_help()
        print("\nExample: python img_compress.py --all-assets")
        print("  Compresses all images under assets/images in place (keeps names).")
        print("Example: python img_compress.py --all-assets --webp")
        print("  Converts all images to WebP in the same dirs (originals kept).")
        print("Example: python img_compress.py --all-assets --webp --backup")
        print("  Same as above, plus copies originals to assets/backup/ before conversion.")
        print("Example: python img_compress.py --all-assets --path ./assets/images/history --webp --backup --backup-dir ./assets/backup")
        print("  Compress only history folder, backup to assets/backup/ with full path structure.")