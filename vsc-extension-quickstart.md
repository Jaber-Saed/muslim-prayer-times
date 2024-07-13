# Muslim Prayer Times

[![Version](https://vsmarketplacebadge.apphb.com/version/jabersaid.prayer-times.svg)](https://marketplace.visualstudio.com/items?itemName=jabersaid.prayer-times)
[![Installs](https://vsmarketplacebadge.apphb.com/installs/jabersaid.prayer-times.svg)](https://marketplace.visualstudio.com/items?itemName=jabersaid.prayer-times)
[![Ratings](https://vsmarketplacebadge.apphb.com/rating/jabersaid.prayer-times.svg)](https://marketplace.visualstudio.com/items?itemName=jabersaid.prayer-times)

A Visual Studio Code extension that displays Muslim prayer times based on the user's location. It includes notifications for prayer times and provides a convenient view in the Primary Side Bar.

## Features

- Display prayer times for Fajr, Dhuhr, Asr, Maghrib, and Isha.
- Show time remaining until the next prayer.
- Send notifications at prayer times.
- Refresh prayer times based on the user's location.

## Installation

### From VS Code Marketplace

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X`.
3. Search for "Muslim Prayer Times" and click "Install".

### From VSIX

1. Download the latest `.vsix` file from the [Releases](https://github.com/your-repo/prayer-times/releases) page.
2. Open Visual Studio Code.
3. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar on the side of the window or by pressing `Ctrl+Shift+X`.
4. Click on the three-dot menu (More Actions) at the top right of the Extensions view, then select `Install from VSIX...`.
5. Select the downloaded `.vsix` file.

## Usage

1. Click on the Prayer Times icon in the Primary Side Bar.
2. View the prayer times for Fajr, Dhuhr, Asr, Maghrib, and Isha.
3. The extension will show notifications at the respective prayer times.
4. To refresh the prayer times, open the Command Palette (`Ctrl+Shift+P`) and run the command `PrayerTimes: Refresh`.

## Configuration

The extension uses the Aladhan API to fetch prayer times based on the user's location. The location is currently mocked for demonstration purposes. Future versions will include automatic location detection.

## Contributing

Contributions are welcome! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Create a new Pull Request.

## Issues

If you encounter any issues or have any suggestions, please open an [issue](https://github.com/your-repo/prayer-times/issues) on GitHub.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgements

- [Aladhan API](https://aladhan.com/) for providing prayer times.
- [Visual Studio Code](https://code.visualstudio.com/) for the amazing code editor.

---

**Developed by [Jaber Said](https://github.com/jabersaid)**

**Special Thanks to the OpenAI Team for providing assistance.**
