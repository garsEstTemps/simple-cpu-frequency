/* -*- mode: js2; js2-basic-offset: 4; indent-tabs-mode: nil -*- */

const Gio = imports.gi.Gio;
const St = imports.gi.St;
const UUID = "simple-cpu-freq@garsEstTemps";
const Main = imports.ui.main;
const Util = imports.misc.util;
const Gettext = imports.gettext;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Applet = imports.ui.applet;
const Settings = imports.ui.settings;

let PanelMenu;
if (typeof require !== 'undefined') {
    PanelMenu = require('./panelMenu');
} else {
    PanelMenu = imports.ui.appletManager.applets[UUID].panelMenu;
}


// Global constants
const READ_CPU_FREQUENCES_CMD = 'grep "cpu MHz" /proc/cpuinfo';
const MAX_ERROR_ALLOWED = 5;
const NO_ENTRY_SYMBOL = '\u26D4';
const DEBUG_LOG_ENABLED = true;

function _(str) {
  return Gettext.dgettext(UUID, str);
}

function log_debug(msg) {
    if (DEBUG_LOG_ENABLED) {
        // TODO Fix that by finding a proper output to log debug messages
        log_error(msg);
    }
}

function log_error(msg) {
    global.logError("SIMPLE_CPU_FREQ_APPLET: " + msg);
}

function parse_frequency_in_output(output_lines) {
    let sum = 0;
    let nb_cpus = 0;
    const splitted_lines = output_lines.split('\n');
    // Last output line is a blank one so iterate over hence the "-2" 
    for (let i = 0; i < splitted_lines.length - 2; i++) {
        const line = splitted_lines[i];
        let pattern = /\d+/
        if (line !== '' && !pattern.test(line)) {
            log_error("Expected output line '" + line + "' from '" + READ_CPU_FREQUENCES_CMD 
                        + "' to contain numeric data but was not.");
            continue;
        }
        sum += parseInt(line.match(pattern));
        nb_cpus++;
    }
    return sum / nb_cpus;
}

function human_readable_freq_from_mghz(freq) {
    freq = Math.round(freq);
    if (freq < 1000) {
        return freq + ' MHz';
    }
    if (freq < 1000000) {
        return Math.round(freq / 10) / 100 + ' GHz';
    }
    return Math.round(freq / 10000) / 100 + ' THz';
}

function Panel_Indicator() {
    this._init.apply(this, arguments);
}

Panel_Indicator.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        PanelMenu.Button.prototype._init.call(this);
        this.buildit();
    },

    buildit: function() {
        this.label = new St.Label({ text: 'Cpu Frequency' });
        this.digit = new St.Label();

        this.box = new St.BoxLayout();
        this.label.visible = false; // override for now - show-text

        this.box.add_actor(this.label);
        this.box.add_actor(this.digit);
        this.actor.add_actor(this.box);
        
    },

    update_content: function(str) {
        this.digit.text = ' ' + str;
    }
};

function CpuFrequencyProvider() {
    this._init.apply(this, arguments);
}

CpuFrequencyProvider.prototype = {
    _init: function(update_time_interval_sec, success_freq_update_callback, error_freq_update_callback) {
        this.success_freq_update_callback = success_freq_update_callback;
        this.error_freq_update_callback = error_freq_update_callback;
        this.periodic_cmd_manager = Mainloop.timeout_add(
            update_time_interval_sec * 1000, Lang.bind(this, this.refresh_cpu_frequency));
    },

    refresh_cpu_frequency: function() {
        Util.spawnCommandLineAsyncIO(READ_CPU_FREQUENCES_CMD, (out, err, errCode) => {
            if (errCode === 0) {
                this.success_freq_update_callback(parse_frequency_in_output(out));
            } else {
                this.error_freq_update_callback("SIMPLECPUFREQ: command '" + READ_CPU_FREQUENCES_CMD 
                                            + "' returned error code '" + errCode + "' (stderr: " + err + ")");
            }
        });
        // This method has to return since otherwise periodic call would stops.
        return true;
    },

    _destroy: function() {
        if (this.periodic_cmd_manager) {
            Mainloop.source_remove(this.periodic_cmd_manager);
            this.periodic_cmd_manager = 0;
        }
    }
}

function main(metadata, orientation, panel_height, instance_id) {
    return new MyApplet(metadata, orientation, panel_height, instance_id);
}

function MyApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
        __proto__: Applet.Applet.prototype,

        _init: function(metadata, orientation, panel_height, instance_id) {
            Applet.Applet.prototype._init.call(this, orientation, panel_height, instance_id);
            try {
                    this.uuid = metadata['uuid'];
                    this.instance_id = instance_id;
            
                    this._initialize_settings();
                    this.nb_errors = 0;
                    this.view = new Panel_Indicator();
                    this.update_view('...');
                    this.reset_frequency_provider();
                    try {
                        this.main_box = new St.BoxLayout({ pack_start: true });
                        this.actor.add(this.main_box);
                        this.main_box.add_actor(this.view.actor);
                    } catch (e) {
                        log_error(e);
                    }

                    Main.themeManager.connect('theme-set', Lang.bind(this, function() {
                        Mainloop.timeout_add(500, Lang.bind(this, this.rebuild));
                    }));
            } catch (e) {
                log_error(e);
            }
        },

        _initialize_settings: function() {
            this.settings = new Settings.AppletSettings(this, this.uuid, this.instance_id);
            this.settings.bindProperty(Settings.BindingDirection.IN,
                                       "update-time-interval",
                                       "update_time_interval_sec",
                                       this.reset_frequency_provider,
                                       null);
        },

        reset_frequency_provider: function() {
            if(this.applet_failure()) {
                // Frequency provider has already been destroyed
                // TODO : display explicit error msg on popup or at least in settings screen
                log_error("Setting change is not taken into account since application fails (see logs above)");
                return;
            }
            this.destroy_frequency_provider();
            this.frequency_provider = new CpuFrequencyProvider(
                this.update_time_interval_sec,
                Lang.bind(this, (frequency_mhz) => this.update_view(human_readable_freq_from_mghz(frequency_mhz))),
                Lang.bind(this, this.handle_error));
        },

        handle_error: function(error_msg) {
            log_error(error_msg);
            this.nb_errors++;
            if (this.applet_failure()) {
                log_error("Application will stop because of too many errors, check logs above and ensure " 
                                + "this applet can run on your system");
                this.destroy_frequency_provider();
                this.update_view(NO_ENTRY_SYMBOL);
            }
        },

        update_view: function(content) {
            this.view.update_content(content);
        },

        applet_failure: function() {
            return this.nb_errors > MAX_ERROR_ALLOWED;
        },

        on_applet_removed_from_panel: function() {
            if (this.main_box) {
                this.actor.remove_actor(this.main_box);
            }

            this.destroy_frequency_provider();
        },

        destroy_frequency_provider: function() {
            if (this.frequency_provider) {
                this.frequency_provider._destroy();
                this.frequency_provider = null;
            }
        }
};
