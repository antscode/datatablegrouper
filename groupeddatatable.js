(function() {
    var Dom = YAHOO.util.Dom, Event = YAHOO.util.Event;

    var GroupedDataTable = function( elContainer , aColumnDefs , oDataSource , oConfigs ) {

	// I there is no 'groupBy attribute in oConfigs return a plain YUI DataTable
	if (! 'groupBy' in oConfigs) {
	    return new GroupedDataTable.superclass.constructor.apply(this, arguments);
	}

	// If there is an existing row formatter, save it so I can call it after my own
	this._oldFormatRow = oConfigs.formatRow;

	// now, set my own
	oConfigs.formatRow = this.rowFormatter;

        // you can use a varable before the declaration is finished?
        GroupedDataTable.superclass.constructor.call(this, elContainer, aColumnDefs, oDataSource, oConfigs);

        this.initGroups(); // Not required but prevents flickering

            // Re-initialise the groups when data is changed
            this.subscribe("sortedByChange", function() { this.initGroups() }); // Not required but prevents flickering
            this.subscribe("renderEvent", function() { this.initGroups() });

            // Update group widths when columns are resized
            this.subscribe("columnSetWidthEvent", function() { this.resizeGroups() });

            // Unselect any group when a row is clicked
            this.subscribe("rowClickEvent", function() { this.unselectGroup() });
    };

    YAHOO.widget.GroupedDataTable = GroupedDataTable;
    YAHOO.lang.extend(GroupedDataTable, YAHOO.widget.DataTable, {
        /**
        * The current group name. Used to determine when a new group starts when rowFormatter is called.
        * @property currentGroupName
        * @type {String}
        * @private
        */
        currentGroupName : null,

        /**
        * The groups found in the current data set.
        * @property groups
        * @type {Array}
        * @private
        */
        groups : [],

        /**
        * A flag to reset the group array. Set each time a new data set is passed.
        * @property resetGroups
        * @type {Boolean}
        * @private
        */
        resetGroups : true,

        /**
        * Event handler for group click.
        * @property groupClickEvent
        * @type {Event}
        */
        onGroupClick : new YAHOO.util.CustomEvent("onGroupClick", this),

        /**
        * The currently selected group
        * @property groupClickEvent
        * @type {Event}
        */
        selectedGroup : null,

        /**
        * A YUI DataTable custom row formatter. The row formatter must be applied to the DataTable
        * via the formatRow configuration property.
        * @method rowFormatter
        * @param tr {Object} To row to be formatted.
        * @param record {Object} To current data record.
        */
        rowFormatter : function(tr, record) {
            if (this.resetGroups) {
                this.groups = [];
                this.currentGroupName = null;
                this.resetGroups = false;
            }

            // var groupBy = this.get("groupBy");  // this returns null but I expect it to work
            var groupBy = this.configs.groupBy;
            var groupName = record.getData(groupBy);

            if (groupName != this.currentGroupName) {
                this.groups.push({ name: groupName, row: tr, group: null });
                Dom.addClass(tr, "group-first-row");
            }

            this.currentGroupName = groupName;
            return true;
        },

        /**
        * Initialises the groups for the current data set.
        * @method initGroups
        * @private
        */
        initGroups : function() {
            if (!this.resetGroups) {
                // Insert each group in the array
                for (var i = 0; i < this.groups.length; i++) {
                    this.groups[i].group = this.insertGroup(this.groups[i].name, this.groups[i].row);
                }

                this.resetGroups = true;
            }
        },

        /**
        * Updates the width of all groups to match the data table.
        * @method resizeGroups
        * @private
        */
        resizeGroups : function() {
            // Insert each group in the array
            for (var i = 0; i < this.groups.length; i++) {
                this.setGroupWidth(this.groups[i].group, this.groups[i].row);
            }
        },

        /**
        * Sets the width of a group to the parent row width.
        * @method resizeGroups
        * @param group {Object} To group to set width to.
        * @param row {Object} To row to get width from.
        * @private
        */
        setGroupWidth : function(group, row) {
            group.style.width = Dom.getRegion(row).width + "px";
        },

        /**
        * Inserts a group before the specified row.
        * @method insertGroup
        * @param name {String} The name of the group.
        * @param beforeRow {Object} To row to insert the group.
        * @private
        */
        insertGroup : function(name, row) {
            var group = document.createElement("div");
            var icon = document.createElement("div");

            // Row is expanded by default
            group.className = "group group-expanded";

            if (Dom.hasClass(row, "yui-dt-first")) {
                // If this is the first row in the table, transfer the class to the group
                Dom.removeClass(row, "yui-dt-first");
                Dom.addClass(group, "group-first");
            }

            // Add a liner as per standard YUI cells
            var liner = document.createElement("div");
            liner.className = "liner";

            // Add icon
            icon.className = "icon";
            liner.appendChild(icon);

            // Add label
            var label = document.createElement("div");
            label.innerHTML = name;
            label.className = "label";
            liner.appendChild(label);
            group.appendChild(liner);

            // Set the width of the group
            this.setGroupWidth(group, row);

            // Insert the group
            var cell = row.cells[0];
            Dom.insertBefore(group, cell.childNodes[0]);

            // Attach visibility toggle to icon click
            Event.addListener(icon, "click", this.toggleVisibility );

            // Attach group click event handler
            Event.addListener(group, "click", this.handleGroupClick, this );

            return group;
        },

        /**
        * Handles the group click event.
        * @method handleGroupClick
        * @param e {Event} The event fired from clicking the group.
        * @private
        */
        handleGroupClick : function(e, dataTable) {
            var group = Dom.getAncestorByClassName(Event.getTarget(e), "group");

            // Fire the onGroupClick event
            dataTable.onGroupClick.fire(group);

            // Stop the event to prevent the row from being selected
            Event.stopEvent(e);
            return false;
        },

        /**
        * Handles the group select event.
        * @method onEventSelectGroup
        * @param type {String} The type of event fired.
        * @param e {Object} The selected group.
        * @private
        */
        onEventSelectGroup : function(type, group, dataTable) {
            dataTable.selectGroup(group);
        },

        /**
        * Selects a group.
        * @method selectGroup
        */
        selectGroup : function(group) {
            // Unselect any previous group
            this.unselectGroup();

            // Select the new group
            Dom.addClass(group, "group-selected");
            this.selectedGroup = group;

            // Unselect all rows in the data table
            var selectedRows = this.getSelectedTrEls();

            for (var i = 0; i < selectedRows.length; i++) {
                this.unselectRow(selectedRows[i]);
            }
        },

        /**
        * Unselects any selected group.
        * @method unselectGroup
        */
        unselectGroup : function() {
            if (this.selectedGroup) {
                Dom.removeClass(this.selectedGroup, "group-selected");
            }
        },

        /**
        * Toggles the visibility of the group specified in the event.
        * @method toggleVisibility
        * @param e {Event} The event fired from clicking the group.
        * @private
        */
        toggleVisibility : function(e) {
            var group = Dom.getAncestorByClassName(Event.getTarget(e), "group");
            var row = Dom.getAncestorByTagName(group, "tr");
            var visibleState;

            // Change the class of the group
            if (Dom.hasClass(group, "group-expanded")) {
                visibleState = false;
                Dom.replaceClass(group, "group-expanded", "group-collapsed");
            }
            else {
                visibleState = true;
                Dom.replaceClass(group, "group-collapsed", "group-expanded");
            }

            // Change the class of the first row
            if (!visibleState) {
                Dom.replaceClass(row, "group-first-row", "group-first-row-collapsed");
            }
            else {
                Dom.replaceClass(row, "group-first-row-collapsed", "group-first-row");
            }

            // Hide all subsequent rows in the group
            row = Dom.getNextSibling(row);

            while (row && !Dom.hasClass(row, "group-first-row") &&
                !Dom.hasClass(row, "group-first-row-collapsed")) {
                if (visibleState) {
                    row.style.display = "table-row";
                }
                else {
                    row.style.display = "none";
                }

                row = Dom.getNextSibling(row);
            }
        }
    });
})();
