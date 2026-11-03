# فتوة العالم (Fotwa El Alam)

Egyptian futuwwa street-fighting game: 3D (three.js) in a Capacitor Android app.

- `www/`: the game (fully offline; fonts and all assets are bundled).
- `android/`: the Android project (package `com.asomygames.fotwa`, landscape, full screen, target SDK 36).
- `.github/workflows/android.yml`: every push to `main` builds the Play bundle (`.aab`) and a test APK and puts them on the `builds` branch.

Third-party assets and licenses: see `www/CREDITS.txt` and `www/fonts/OFL-*.txt`.
