# Music Folder

Place your background music files in this folder. The game will automatically load and play them.

## Supported File Formats
- MP3 (recommended)
- WAV
- OGG

## Default Music Files
The game expects these files by default:

- `battle_theme.mp3` - Main battle music (plays during gameplay)
- `menu_theme.mp3` - Menu music (optional)
- `victory_theme.mp3` - Victory music (optional)

## Adding Your Own Music
1. Place your music files in this folder
2. Update the `playMusic()` calls in the game code to use your file names
3. Make sure the files are in a supported format

## Example Usage
```javascript
// Play the main battle theme
audioSystem.playMusic('battle_theme.mp3');

// Play custom music
audioSystem.playMusic('my_custom_track.mp3');
```

## File Size Recommendations
- Keep files under 5MB for faster loading
- Use compressed formats (MP3) to reduce file size
- Consider using shorter loops (30-60 seconds) for better performance
