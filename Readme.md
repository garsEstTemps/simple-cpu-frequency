## Simple CPU Frequency
### Setup
1. Ensure application is not running (remove it if needed)
2. Restart Cinnamon (alt + F2 then hit 'r' or use applet)
3. "Deploy" applet for coding repo
```
mkdir ~/.local/share/cinnamon/applets/simple-cpu-freq@garsEstTemps \ 
&& cp /path/to/coding_folder/simple-cpu-freq@garsEstTemps/applet.js \
      /path/to/coding_folder/simple-cpu-freq@garsEstTemps/metadata.json \
      /path/to/coding_folder/simple-cpu-freq@garsEstTemps/icon.png \
      /path/to/coding_folder/simple-cpu-freq@garsEstTemps/panelMenu.js \
      /path/to/coding_folder/simple-cpu-freq@garsEstTemps/stylesheet.css \
      /path/to/coding_folder/simple-cpu-freq@garsEstTemps/settings-schema.json \
      ~/.local/share/cinnamon/applets/simple-cpu-freq@garsEstTemps
```
4. The Simple CPU Frequency should be visible in the "Manage" tab of the "Applets" application, then just need to setup it

### Troubleshooting

Use method `log_debug()` and ensure the constant `DEBUG_LOG_ENABLED` is set to `true` and follow logs 
in the homedir `.xsession-errors` file (e.g `tail -F ~/.xsession-errors`).
