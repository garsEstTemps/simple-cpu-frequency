// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Cinnamon = imports.gi.Cinnamon;
const Signals = imports.signals;
const St = imports.gi.St;

const Main = imports.ui.main;
const Params = imports.misc.params;
const PopupMenu = imports.ui.popupMenu;
const PanelLoc = {
  top : 0,
  bottom : 1,
  left : 2,
  right : 3
};

function ButtonBox(params) {
    this._init.apply(this, arguments);
};

ButtonBox.prototype = {
    _init: function(params) {
        params = Params.parse(params, { style_class: 'panel-button' }, true);
        this.actor = new Cinnamon.GenericContainer(params);
        this.actor._delegate = this;

        this.actor.connect('get-preferred-width', Lang.bind(this, this._getPreferredWidth));
        this.actor.connect('get-preferred-height', Lang.bind(this, this._getPreferredHeight));
        this.actor.connect('allocate', Lang.bind(this, this._allocate));

        this.actor.connect('style-changed', Lang.bind(this, this._onStyleChanged));
        this._minHPadding = this._natHPadding = 0.0;
    },

    _onStyleChanged: function(actor) {
        let themeNode = actor.get_theme_node();

        this._minHPadding = themeNode.get_length('-minimum-hpadding');
        this._natHPadding = themeNode.get_length('-natural-hpadding');
    },

    _getPreferredWidth: function(actor, forHeight, alloc) {
        let children = actor.get_children();
        let child = children.length > 0 ? children[0] : null;

        if (child) {
            [alloc.min_size, alloc.natural_size] = child.get_preferred_width(-1);
        } else {
            alloc.min_size = alloc.natural_size = 0;
        }

        alloc.min_size += 2 * this._minHPadding;
        alloc.natural_size += 2 * this._natHPadding;
    },

    _getPreferredHeight: function(actor, forWidth, alloc) {
        let children = actor.get_children();
        let child = children.length > 0 ? children[0] : null;

        if (child) {
            [alloc.min_size, alloc.natural_size] = child.get_preferred_height(-1);
        } else {
            alloc.min_size = alloc.natural_size = 0;
        }
    },

    _allocate: function(actor, box, flags) {
        let children = actor.get_children();
        if (children.length == 0)
            return;

        let child = children[0];
        let [minWidth, natWidth] = child.get_preferred_width(-1);
        let [minHeight, natHeight] = child.get_preferred_height(-1);

        let availWidth = box.x2 - box.x1;
        let availHeight = box.y2 - box.y1;

        let childBox = new Clutter.ActorBox();
        if (natWidth + 2 * this._natHPadding <= availWidth) {
            childBox.x1 = this._natHPadding;
            childBox.x2 = availWidth - this._natHPadding;
        } else {
            childBox.x1 = this._minHPadding;
            childBox.x2 = availWidth - this._minHPadding;
        }

        if (natHeight <= availHeight) {
            childBox.y1 = Math.floor((availHeight - natHeight) / 2);
            childBox.y2 = childBox.y1 + natHeight;
        } else {
            childBox.y1 = 0;
            childBox.y2 = availHeight;
        }

        child.allocate(childBox, flags);
    },
}

function Button(menuAlignment) {
    this._init(menuAlignment);
}

Button.prototype = {
    __proto__: ButtonBox.prototype,

    _init: function(menuAlignment) {
        ButtonBox.prototype._init.call(this, { reactive: true,
                                               can_focus: true,
                                               track_hover: true });
        this.menu = new PopupMenu.PopupMenu(this.actor, Main.applet_side);
        this.menu.actor.add_style_class_name('panel-menu');
        Main.uiGroup.add_actor(this.menu.actor);
        this.menu.actor.hide();
    },

    destroy: function() {
        this.actor._delegate = null;

        this.menu.destroy();
        this.actor.destroy();

        this.emit('destroy');
    }
};
Signals.addSignalMethods(Button.prototype);