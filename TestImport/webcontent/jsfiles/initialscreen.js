
define(['backbone.cws',
    'text!./templates/initialscreen.htm!strip',
    'underscore',
	'text'
], function (BackboneCWS, UpgradeAction1Template, _,text) {

    return BackboneCWS.DetailsView.extend({

        viewName: 'InitialScreenView',

        template: _.template(UpgradeAction1Template),

        bindings: {
            'input[name="upgrade-option"]': {
                observe: 'UpgradeOption',
				onGet: function (val, options) {
					return val;
				},
                updateModel: function (val, evt, options) {
					return true;
				},
            }
		},

        initialize: function (options) {
            BackboneCWS.DetailsView.prototype.initialize.apply(this, [options]);
            this.parentView = options.parentView;
            this.app = options.app;
            this.workspaceEnv = this.parentView.workspaceEnv;
            this.isTeamDev = this.parentView.isTeamDev;
            this.workspaceDoc = this.parentView.workspaceDoc;
        },

        afterRender: function () {
            BackboneCWS.DetailsView.prototype.afterRender.apply(this);
            if(this.isTeamDev) {
                this.$el.find(".team-dev").show();
            }
            this.updateRadioButtons();
        },

        updateRadioButtons: function () {
            var revertRadioButton = this.$el.find("input[name='upgrade-option'][id='revert']");
            var makeAvailableRadioButton = this.$el.find("input[name='upgrade-option'][id='push-changes']");
            var foundValidLock = this.parentView.userHasOwnedLockInSCM();
            var foundModifications = this.parentView.outgoingChanges && this.parentView.outgoingChanges.entries().size() > 0;
            var noteOnLocksNoChanges = this.translator.translate("noteOnLocksNoChanges")
            var noteOnNoLocksNoChanges = this.translator.translate("noteOnNoLocksNoChanges");
            var noteOnNoLocksButChanges = this.translator.translate("noteOnNoLocksButChanges");
           
            if (!this.isTeamDev) {
                revertRadioButton.hide();
                makeAvailableRadioButton.hide();
            }
            else {
                if (foundValidLock) {
                    if (foundModifications) {
                        // Both revert and make available may be done
                    }
                    else {
                        makeAvailableRadioButton.prop('disabled', true);
                        makeAvailableRadioButton.siblings(".disabled-message").find(".info-text").text(noteOnLocksNoChanges);
                        makeAvailableRadioButton.siblings(".disabled-message").show();
                        revertRadioButton.prop('disabled', true);
                        revertRadioButton.siblings(".disabled-message").find(".info-text").text(noteOnLocksNoChanges);
                        revertRadioButton.siblings(".disabled-message").show();
                    }
                }
                else //no valid lock found, the repos might have been updated already. Need to upgrade first.
                {
                    makeAvailableRadioButton.prop('disabled', true);
                    makeAvailableRadioButton.siblings(".disabled-message").show();
                    makeAvailableRadioButton.siblings(".disabled-message").find(".info-text").text(noteOnNoLocksButChanges);
                    
                    if (foundModifications) {
                    }
                    else {
                        revertRadioButton.prop('disabled', true);
                        revertRadioButton.siblings(".disabled-message").show();
                        makeAvailableRadioButton.siblings(".disabled-message").find(".info-text").text(noteOnNoLocksNoChanges);
                        revertRadioButton.siblings(".disabled-message").find(".info-text").text(noteOnNoLocksNoChanges);
                    }
                }
            }
        },
    });
});