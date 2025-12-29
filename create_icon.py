import base64
import os

# A simple purple square icon in base64
icon_base64 = "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVHhe7cExAQAAAMKg9U9tDQ+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOBvDLQAAf5MuegAAAAASUVORK5CYII="

icon_data = base64.b64decode(icon_base64)

with open('/home/ubuntu/sticky-notes-web/client/public/icon-128.png', 'wb') as f:
    f.write(icon_data)

print("Icon created successfully.")
