define(['backbone.cws',
    'text!./templates/upgradescreen.htm!strip',
    './initialscreen',
    './workspacewizardscreen',
    '../../../util/js/jobprogress',
    'cwstype!com.cordys.cws.runtime.types.workspace.DevelopmentWorkspace',
    'cwstype!com.cordys.cws.umf.common.util.StudioUMFList',
    'cwstype!com.cordys.cws.runtime.types.teamdevelopment.NullAdapter',
    "cwstype!com.cordys.cws.umf.common.util.StudioUMFQuickSet",
    "../../../scm/views/determinechanges",
    "../../../scm/js/scmdeterminechanges",
    "../../../scm/views/revertchanges",
    "../../../scm/js/scmrevertchanges",
    "../../../scm/views/showlocks",
    'underscore',
    'css!' + './styles/upgradescreen.css',
], function (BackboneCWS, UpgradeScreenTemplate, InitialScreen, WorkspaceWizardScreen, JobProgress, DevelopmentWorkspace, StudioUMFList, NullAdapter, StudioUMFQuickSet, DetermineChangesView, SCMDetermineChanges, RevertChanges, SCMRevertChanges, ShowLocks, _) {

    return BackboneCWS.DetailsView.extend({

        viewName: 'UpgradeScreenView',

        template: _.template(UpgradeScreenTemplate),

        initialize: function (options) {
            BackboneCWS.DetailsView.prototype.initialize.apply(this, [options]);
            this.options = options;
            this.app = options.app;
            this.wsEnv = options.wsEnv;
            this.workspaceDoc = this.wsEnv.workspace();
            this.workspaceName = this.workspaceDoc.name();
            var scmAdapterObject = this.workspaceDoc.sCMAdapter();
            this.isFromOpenAction = options.isFromOpenAction;
            this.isTeamDev = scmAdapterObject && !scmAdapterObject.instanceOf(NullAdapter);
            this.upgradeModel = new Backbone.CWS.CWSBackboneModel({
                UpgradeOption: 'upgrade'
            });
        },

        getViewForStep: function (stepName) {
            this.dialogView.element.find(".dialog-title .icon-warning").text(this.translator.translate("titleUpgradeWorkspace"));
            if (stepName == "InitialScreen") {
                this.upgradeActionView = new InitialScreen({
                    app: this.app,
                    model: this.upgradeModel,
                    parentView: this
                });
            } else if (stepName == "PushChanges") {
                this.upgradeActionView = new DetermineChangesView({
                    app: this.app,
                    parentView: this,
                    wsEnv: this.wsEnv,
                    incomingChanges: null,
                    outgoingChanges: this.outgoingChanges,
                });
                var onFinishHandler = (evt) => {
                    this.app.router.navigate("/allworkspaces", { trigger: true });
                }
                this.updateButtons(this.translator.translate("lblPushChanges"), () => {
                    new SCMDetermineChanges(this.app, this.wsEnv).pushChanges(-1, this.upgradeActionView.getCommentValue(), onFinishHandler);
                });
            } else if (stepName == "RevertChanges") {
                this.upgradeActionView = new RevertChanges({
                    entries: this.outgoingChanges.entries(),
                    app: this.app
                });
                var onFinishHandler = (evt) => {
                    this.app.router.navigate("/allworkspaces", { trigger: true });
                }
                this.updateButtons(this.translator.translate("revertButton"), () => {
                    new SCMRevertChanges(this.app, this.wsEnv).revertChanges(onFinishHandler);
                });
            } else if (stepName == "ShowLocks") {
                this.upgradeActionView = new ShowLocks({
                    entries: this.locksOnRepository,
                    app: this.app,
                    workspaceDoc: this.wsEnv,
                    documentInfo: this.translator.translate("locksUpgradeWarning")
                });
                this.updateButtons();
                this.dialogView.element.find(".dialog-title .icon-warning").text(this.translator.translate("titleLocksUpgradeWarning"));
            }
            return this.upgradeActionView;
        },

        openDialog: async function () {
            if (this.isTeamDev) {
                await this.checkForChanges();
                await this.checkForLocks();
            }
            var dialogSize = this.isTeamDev ? "medium" : "small";
            this.dialogView = this.showDialog({
                titleTemplate: `<span class="icon-warning">${this.translator.translate("titleUpgradeWorkspace")}</span>`,
                okButtonText: this.translator.translate("btnContinue"),
                size: dialogSize,
                innerView: this,
                lightDialog: true,
                footerWarning: true
            }, () => { },
                () => {
                    this.app.router.navigate("/allworkspaces", { trigger: true });
                });
            this.addButtons();
            this.dialogView.element.find("#okButton").hide();
            this.dialogView.element.find("#previousButton").hide();
        },

        afterRender: async function () {
            BackboneCWS.DetailsView.prototype.afterRender.apply(this);

            this.workspaceWizardScreen = new WorkspaceWizardScreen({
                view: this,
                app: this.app,
                placeHolderID: "wizardview",
                steps: ["InitialScreen", "PushChanges", "RevertChanges", "ShowLocks"],
                viewCallbackHandler: this.getViewForStep
            });
            this.registerUIComponent(this.workspaceWizardScreen);
            var dialogElements = this.dialogView.element;
            this.okButton = dialogElements.find("#okButton");
            this.nextButton = dialogElements.find("#nextButton");
            this.previousButton = dialogElements.find("#previousButton");
            var nextButtonHandler = () => {
                var checkedWSID = this.upgradeActionView.$el.find('input[type="radio"]:checked')[0].id;
                if (checkedWSID == 'upgrade') {
                    if (this.isTeamDev && this.locksByOthersOnRepository.size() > 0) {
                        return "ShowLocks";
                    }
                    var self = this;
                    var jobprogress = new JobProgress(null, {
                        app: this.app,
                        document: this.workspaceDoc,
                        isModal: false,
                        showDetails: false,
                        message: self.translator.translate("upgradingWSInfo", this.workspaceName),
                        successMessage: self.translator.translate("upgradeWSSuccessInfo", this.workspaceName),
                        errorMessage: self.translator.translate("upgradeWSErrorInfo", this.workspaceName),
                        onFinish: function (evt) {
                            if (evt.successful) {
                                if(evt.businessObject) {
                                    evt.businessObject.save();
                                    evt.businessObject.refresh();
                                }
                                if (self.isFromOpenAction) {
                                    self.app.router.navigate("/" + self.workspaceName + "/", { trigger: true });
                                }
                                else {
                                    window.location.reload();
                                }
                            } else {
                                self.app.router.navigate("/allworkspaces", { trigger: true });
                            }
                        }
                    });
                    this.workspaceDoc.upgrade(jobprogress.jobHandler());
                    this.dialogView.close();
                } else if (checkedWSID == 'delete-workspace') {
                    var self = this;
                    this.app.systemEnvironment = null;
                    var systemEnvironment = this.app.getSystemEnvironment();
                    var workspaceToDelete = systemEnvironment.getWorkspaceInSystemWorkspace(this.workspaceDoc);
                    var documentPlant = systemEnvironment.documentPlant();
                    if (!workspaceToDelete.isTransient()) {
                        if (this.wsEnv.isRunningInSystemWorkspace()) {
                            this.wsEnv.handleWorkspaceRemove(workspaceToDelete);
                        }
                    }
                    var jobprogress = new JobProgress(null, {
                        app: this.app,
                        document: systemEnvironment.workspace(),
                        isModal: false,
                        showDetails: false,
                        message: self.translator.translate("deletingWSInfo", this.workspaceName),
                        successMessage: self.translator.translate("deleteSuccessfulInfo", this.workspaceName),
                        errorMessage: self.translator.translate("deleteErrorInfo", this.workspaceName),
                        onFinish: function (evt) {
                            if (evt.successful) {
                                var currentFrag = Backbone.history.getFragment();
                                if (currentFrag == 'allworkspaces' || currentFrag == 'allworkspaces/') {
                                    var allWorkspacesView = this.app.layout.views['#allWorkspacesList'];
                                    if(allWorkspacesView) {
                                        allWorkspacesView.refreshWorkspaces().then(()=>{
                                            allWorkspacesView.closeDetailsView();
                                        });
                                    }
                                } else {
                                    this.app.router.navigate("/allworkspaces", { trigger: true });
                                }
                            } else {
                                this.app.router.navigate("/allworkspaces", { trigger: true });
                            }
                        }
                    });
                    var list = new StudioUMFList();
                    list.add(workspaceToDelete);
                    DevelopmentWorkspace.removeFromRepository(documentPlant, list, jobprogress.jobHandler());
                    this.dialogView.close();
                } else if (checkedWSID == "push-changes") {
                    return "PushChanges";
                } else if (checkedWSID == "revert") {
                    return "RevertChanges";
                }
            }
            var previousButtonHandler = () => {
                this.previousButton.hide();
                this.nextButton.show();
                this.okButton.hide();
                return "InitialScreen";
            }

            this.workspaceWizardScreen.registerButtons(
                {
                    nextButton: {
                        element: this.nextButton,
                        handler: nextButtonHandler
                    },
                    previousButton: {
                        element: this.previousButton,
                        handler: previousButtonHandler
                    }

                });
        },

        addButtons: function () {
            this.dialogView.addButton(this.app.i18n().translate("btnContinue"), {
                id: "nextButton",
                insertBefore: "cancelButton",
                className: "button-primary"
            });
            this.dialogView.addButton(this.app.i18n().translate("previousButton"), {
                id: "previousButton",
                insertBefore: "okButton"
            });
        },

        updateButtons: function (okButtonText, handler) {
            this.previousButton.show();
            this.nextButton.hide();
            if (okButtonText) {
                this.okButton.text(okButtonText);
                this.okButton.show();
                this.okButton.removeClass("disabled");
                if (!handler) {
                    handler = () => { };
                }
                this.okButton.on("click", () => {
                    handler();
                });
            }
        },

        checkForChanges: function () {
            return new Promise((resolve, reject) => {
                var jobprogress = new JobProgress(null, {
                    app: this.app,
                    document: this.workspaceDoc,
                    isModal: true,
                    showDetails: true,
                    message: this.translator.translate("lblDetermingChanges"),
                    closeOnSuccess: true,
                    onFinish: (evt) => {
                        var entries = evt.result;
                        this.outgoingChanges = entries.outgoingChanges();
                        resolve();
                    }
                });
                TeamDevelopment.determineChangeSet(this.workspaceDoc.documentPlant(), jobprogress.jobHandler());
            });
        },

        checkForLocks: function () {
            return new Promise((resolve, reject) => {
                var jobprogress = new JobProgress(null, {
                    app: this.app,
                    document: this.workspaceDoc,
                    isModal: true,
                    showDetails: true,
                    message: this.translator.translate("lblShowLocksMessage"),
                    closeOnSuccess: true,
                    onFinish: (evt) => {
                        this.locksOnRepository = evt.result;
                        this.locksByOthersOnRepository = this.determineLocksByOthersOnRepository(evt);
                        resolve();
                    }
                });
                TeamDevelopment.determineLocksOnRepository(this.workspaceDoc.documentPlant(), jobprogress.jobHandler());
            });
        },

        determineLocksByOthersOnRepository: function () {
            var locksInReposByOthers = null;
            if (this.locksOnRepository) {
                var locksInReposByOthers = this.locksOnRepository.clone();
                var iterator = locksInReposByOthers.iterator();
                var lock;
                while (iterator.hasNext()) {
                    lock = iterator.next();
                    if (lock.instanceOf(OwnedSCMLockEntry)) {
                        iterator.remove();
                    }
                }
            }
            return locksInReposByOthers ? locksInReposByOthers : new StudioUMFQuickSet();
        },

        userHasOwnedLockInSCM: function () {
            if (this.locksOnRepository) {
                var iterator = this.locksOnRepository.iterator();
                var lock;
                while (iterator.hasNext()) {
                    lock = iterator.next();
                    if (lock.instanceOf(OwnedSCMLockEntry)) {
                        return true;
                    }
                }
            }
            return false;
        }
    });
});