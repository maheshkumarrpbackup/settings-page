define([
    'settings/js/widgets/community-widget',
    'test/test-utils'
], function(CommunityWidget, utils) {

    describe('Community widget', function() {
        var strings = utils.createStringMap('confirmOkText', 'confirmMessage', 'confirmTitle', 'connectionSecurity',
            'databaseLabel', 'disable', 'disabled', 'enable', 'enabled', 'fromLabel', 'hostPlaceholder', 'loading',
            'loginTypeLabel', 'passwordLabel', 'passwordRedacted', 'passwordDescription', 'portPlaceholder', 'toDescription',
            'toLabel', 'usernameLabel', 'validateButton', 'validateFailed', 'validateSuccess');

        var initialConfig = {
            community: {host: 'example.com', port: 9003, protocol: 'HTTPS', productType: 'UASERVER', indexErrorMessage: 'What\'s an index?'},
            method: 'LDAP'
        };

        beforeEach(function() {
            this.addMatchers({
                toDisplayConfig: function(config) {
                    var $el = this.actual;

                    var actualConfig = _.extend({
                        community: {
                            host: $el.find('input[name="host"]').val(),
                            port: Number($el.find('input[name="port"]').val()),
                            protocol: $el.find('select[name="protocol"]').val()
                        },
                        method: $el.find('select[name="login-type"]').val()
                    }, config);

                    this.message = function() {
                        return 'Expected "' + $el.get(0).outerHTML + '" to display config "' + JSON.stringify(config) + '"';
                    };

                    return _.isEqual(config, actualConfig);
                },
                toContainOptions: function(options) {
                    // Doesn't account for duplicates.
                    var $select = this.actual;
                    var $options = $select.find('option');

                    this.message = function() {
                        return 'Expected "' + $select.get(0).outerHTML + '" to contain options "' + JSON.stringify(options) + '"';
                    };

                    if ($options.length != options.length) {
                        return false;
                    }

                    var isMatch = true;

                    _.each(options, function(value) {
                        if (isMatch && $options.filter('[value="' + value + '"]').length != 1) {
                            isMatch = false;
                        }
                    });

                    return isMatch;
                }
            });

            this.widget = new CommunityWidget({
                configItem: 'login',
                description: 'This widget controls Site Admin\'s connection to your Community server.',
                indexErrorMessage: 'What\'s an index?',
                productType: 'UASERVER',
                securityTypesUrl: '/securitytypes',
                strings: strings,
                title: 'Community'
            });

            this.typesModel = this.widget.securityTypesModel;
            spyOn(this.typesModel, 'fetch');
            this.widget.render();
            this.$loginType = this.widget.$('select[name="login-type"]');
            this.$aciDetails = this.widget.$('div.control-group').eq(0);
        });

        it('should render correctly', function() {
            expect(this.widget.$el).toDisplayConfig({community: {host: '', port: 0, protocol: 'HTTP'}, method: null});
            expect(this.$loginType).toHaveAttr('disabled');
            expect(this.$aciDetails).not.toHaveClass('success');
            expect(this.$aciDetails).not.toHaveClass('error');
        });

        _.each(['cas', 'external'], function(type) {
            it('should correctly handle the non-community "' + type + '" login type', function() {
                var currentConfig = _.defaults({method: type}, initialConfig);
                var communityTypes = ['autonomy', 'LDAP'];
                this.widget.updateConfig(currentConfig);

                expect(this.widget.$el).toDisplayConfig(currentConfig);
                expect(this.$loginType).toHaveAttr('disabled');

                this.widget.lastValidationConfig = currentConfig;
                this.widget.handleValidation(currentConfig, {valid: true});
                this.typesModel.securityTypes = communityTypes;
                this.typesModel.trigger('change');

                expect(this.$loginType).toContainOptions(_.union(communityTypes, type));
                expect(this.$loginType).not.toHaveAttr('disabled');
                expect(this.widget.$el).toDisplayConfig(currentConfig);
            });
        });

        describe('after a config update', function() {
            beforeEach(function() {
                this.widget.updateConfig(initialConfig);
            });

            it('should display the correct config', function() {
                expect(this.widget.$el).toDisplayConfig(initialConfig);
            });

            it('should return the correct config', function() {
                expect(this.widget.getConfig()).toEqual(initialConfig);
            });

            it('should keep the login types input disabled', function() {
                expect(this.$loginType).toHaveAttr('disabled');
            });

            it('should apply error formatting after failed validation', function() {
                this.widget.lastValidationConfig = initialConfig;
                this.widget.handleValidation(initialConfig, {valid: false});

                expect(this.$aciDetails).toHaveClass('error');
                expect(this.$aciDetails).not.toHaveClass('success');
                expect(this.typesModel.fetch).not.toHaveBeenCalled();
            });

            it('should fail client side validation with an empty host input', function() {
                var $host = this.widget.$('input[name="host"]');
                var $clientValidationSpan = this.widget.$('.settings-client-validation');

                this.widget.lastValidationConfig = initialConfig;
                this.widget.handleValidation(initialConfig, {valid: true});

                expect(this.widget.$el).not.toHaveClass('success');
                expect(this.$aciDetails).toHaveClass('success');
                expect($clientValidationSpan).toHaveClass('hide');

                $host.val('').trigger('change');

                expect(this.widget.$el).not.toHaveClass('success');
                expect(this.$aciDetails).not.toHaveClass('success');
                expect(this.$aciDetails).not.toHaveClass('error');
                expect($clientValidationSpan).toHaveClass('hide');

                var isValid = this.widget.validateInputs();

                expect(isValid).toBeFalsy();
                expect(this.widget.$el).not.toHaveClass('success');
                expect(this.$aciDetails).toHaveClass('error');
                expect(this.$aciDetails).not.toHaveClass('success');
                expect($clientValidationSpan).not.toHaveClass('hide');

                $host.val('yoda').trigger('change');

                expect(this.widget.$el).not.toHaveClass('success');
                expect(this.$aciDetails).not.toHaveClass('error');
                expect(this.$aciDetails).not.toHaveClass('success');
                expect($clientValidationSpan).toHaveClass('hide');

                $host.val(initialConfig.community.host).trigger('change');

                expect(this.widget.$el).not.toHaveClass('success');
                expect(this.$aciDetails).toHaveClass('success');
                expect(this.$aciDetails).not.toHaveClass('error');
                expect($clientValidationSpan).toHaveClass('hide');
            });

            describe('after a change to the port input', function() {
                beforeEach(function() {
                    this.$port = this.widget.$('input[name="port"]').val(123).trigger('change');
                });

                it('should not apply the validation response when it returns', function() {
                    this.widget.lastValidationConfig = initialConfig;
                    this.widget.handleValidation(initialConfig, {valid: true});

                    expect(this.$aciDetails).not.toHaveClass('success');

                    this.$port.val(9003).trigger('change');

                    expect(this.$aciDetails).toHaveClass('success');
                    expect(this.$aciDetails).not.toHaveClass('error');
                });
            });

            describe('after successful validation', function() {
                beforeEach(function() {
                    this.widget.lastValidationConfig = initialConfig;
                    this.widget.handleValidation(initialConfig, {valid: true});
                });

                it('should apply success formatting to the aci details inputs', function() {
                    expect(this.$aciDetails).toHaveClass('success');
                    expect(this.$aciDetails).not.toHaveClass('error');
                    expect(this.widget.$el).not.toHaveClass('success');
                    expect(this.widget.$el).not.toHaveClass('error');
                });

                it('should keep the login types input disabled and fetch new security types', function() {
                    expect(this.$loginType).toHaveAttr('disabled');
                    expect(this.typesModel.fetch).toHaveBeenCalled();
                    expect(this.typesModel.fetch.calls.length).toEqual(1);

                    expect(this.typesModel.fetch).toHaveBeenCalledWith({data: {
                        host: initialConfig.community.host,
                        port: initialConfig.community.port,
                        protocol: initialConfig.community.protocol
                    }});
                });

                it('should correctly handle new security types containing the currently selected type', function() {
                    var newTypes = this.typesModel.securityTypes = ['yoda', 'LDAP', 'autonomy'];
                    this.typesModel.trigger('change');

                    expect(this.$loginType).not.toHaveAttr('disabled');
                    expect(this.widget.$el).toDisplayConfig(initialConfig);
                    expect(this.$loginType).toContainOptions(newTypes);
                });

                describe('after change to the host input', function() {
                    beforeEach(function() {
                        this.$host = this.$aciDetails.find('[name="host"]');
                        this.$host.val('my-new-host.com').trigger('change');
                    });

                    it('should clear validation formatting', function() {
                        expect(this.$aciDetails).not.toHaveClass('success');
                        expect(this.$aciDetails).not.toHaveClass('error');
                    });

                    it('should not enable the login types input on new security types', function() {
                        this.typesModel.securityTypes = ['autonomy', 'LDAP'];
                        this.typesModel.trigger('change');

                        expect(this.$loginType).toHaveAttr('disabled');

                        this.$host.val('example.com').trigger('change');

                        expect(this.$loginType).not.toHaveAttr('disabled');
                    });

                    it('should return validation formatting if it is changed back', function() {
                        this.$host.val('example.com').trigger('change');

                        expect(this.$aciDetails).toHaveClass('success');
                        expect(this.$aciDetails).not.toHaveClass('error');
                    });

                    it('should return the correct config', function() {
                        expect(this.widget.getConfig()).toEqual(_.defaults({
                            community: _.defaults({
                                host: 'my-new-host.com'
                            }, initialConfig.community)
                        }, initialConfig));
                    });

                    it('should trigger validation on clicking Test Connection', function() {
                        spyOn(this.widget, 'trigger');
                        this.widget.$('[name="validate"]').click();

                        expect(this.widget.trigger).toHaveBeenCalledWith('validate');
                    });
                });
            });
        });
    });

});