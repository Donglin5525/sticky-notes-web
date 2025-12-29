import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create a new image with a transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw a rounded rectangle (sticky note shape)
    padding = size // 8
    rect_coords = [padding, padding, size - padding, size - padding]
    
    # Draw shadow
    shadow_offset = size // 16
    shadow_coords = [rect_coords[0] + shadow_offset, rect_coords[1] + shadow_offset, 
                     rect_coords[2] + shadow_offset, rect_coords[3] + shadow_offset]
    draw.rounded_rectangle(shadow_coords, radius=size//5, fill=(0, 0, 0, 50))

    # Draw main note body (Yellow)
    draw.rounded_rectangle(rect_coords, radius=size//5, fill='#FEF08A') # bg-note-yellow

    # Draw a small "fold" or "line" to represent text
    line_x_start = rect_coords[0] + size // 4
    line_x_end = rect_coords[2] - size // 4
    line_y_start = rect_coords[1] + size // 3
    line_spacing = size // 6

    draw.line([line_x_start, line_y_start, line_x_end, line_y_start], fill='#D97706', width=size//12)
    draw.line([line_x_start, line_y_start + line_spacing, line_x_end, line_y_start + line_spacing], fill='#D97706', width=size//12)

    # Save the image
    img.save(filename)

# Create icons directory if it doesn't exist
os.makedirs('/home/ubuntu/sticky-notes-web/client/public/icons', exist_ok=True)

# Generate icons of different sizes
create_icon(16, '/home/ubuntu/sticky-notes-web/client/public/icons/icon16.png')
create_icon(48, '/home/ubuntu/sticky-notes-web/client/public/icons/icon48.png')
create_icon(128, '/home/ubuntu/sticky-notes-web/client/public/icons/icon128.png')

print("Icons generated successfully!")
