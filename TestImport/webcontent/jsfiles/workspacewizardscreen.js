define(['backbone.cws',
    'text!./templates/workspacewizardscreen.htm!strip', 'underscore'
], function (BackboneCWS, WorkspaceWizardScreenTemplate, _) {

    return BackboneCWS.UIComponent.extend({

        viewName: 'WorkspaceWizardScreen',
        initialize: function (options) {
            this.options = options;
            this.app = options.app;
            this.viewCallback = options.viewCallbackHandler;
            this.currentActiveStep = 1;
            this.viewsMap = new Map();
            this.steps = options.steps;
            this.render();
        },

        render: function () {
            var self = this;
            this.$el = this.view.$el.find("#" + this.options.placeHolderID);
            this.$el.append(_.template(WorkspaceWizardScreenTemplate));
            var activeStepName = self.steps[self.currentActiveStep - 1];
            var viewToRender = self.getViewForStep(activeStepName);
            self.$el.find("#workspacewizardview").append(viewToRender.render().el);
        },

        registerButtons: function (options) {
            var self = this;
            this.nextElement = options.nextButton;
            this.previousElement = options.previousButton;
            this.nextElement.element.on('click', () => {
                var handler = self.nextElement.handler;
                if (handler) {
                    var viewToInsert = handler();
                    if (viewToInsert) {
                        self.navigateButtonEvent(viewToInsert);
                    }
                }
            });

            this.previousElement.element.on('click', () => {
                var handler = self.previousElement.handler;
                if (handler) {
                    var viewToInsert = handler();
                    if (viewToInsert) {
                        self.navigateButtonEvent(viewToInsert);
                    }
                }
            });
        },

        navigateButtonEvent: function (viewToInsert) {
            var self = this;
            self.$el.find("#workspacewizardview").empty();
            var viewToRender = self.getViewForStep(viewToInsert);
            self.$el.find("#workspacewizardview").append(viewToRender.render().el);
        },

        getViewForStep: function (stepName) {
            var viewToRender = this.viewsMap.get(stepName);
            viewToRender = this.viewCallback.bind(this.options.view)(stepName);
            this.viewsMap.set(stepName, viewToRender);
            return viewToRender;
        },
    });
});