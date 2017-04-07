/**
 * Created by lokma on 13/1/2017.
 */
angular.module('attendengApp', ['ionic','ja.qr', 'ngCordova'])

.controller('jongCtrl', jongCtrl)
.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider
        .state('index', {
            url: '/',
            templateUrl: 'index.html'
        })
        .state('terminal', {
            url: '/terminal',
            templateUrl: 'terminal.html'
        });
    $urlRouterProvider.otherwise('/');
})

jongCtrl.$inject = ['$scope', '$http', '$ionicModal', '$cordovaBarcodeScanner', '$cordovaToast', '$cordovaDevice', '$state']


function jongCtrl($scope, $http, $ionicModal, $cordovaBarcodeScanner, $cordovaToast, $cordovaDevice, $state) {

    var vm = this
    vm.qrCodeDisplay = false

    vm.string = 'nil';
    vm.title = 'no action'
    vm.terminal_mode = false

    vm.username = ''
    // vm.user = {
    //     'username': 'attendeng',
    //     'password': '4tt3ndeng'
    // }

    vm.baseURL = 'http://attendeng.infinitelogix.com.my'
    // vm.baseURL = 'http://localhost/attendeng_core/public'
    // vm.logs = []

    vm.loggedIn = false

    if (localStorage.getItem('username') && localStorage.getItem("username") !== null)
    {
        vm.username = localStorage.getItem('username')
    }

    if (localStorage.getItem('token') && localStorage.getItem("token") !== null)
    {
        vm.loggedIn = true
    }

    $ionicModal.fromTemplateUrl('qr-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modalQr = modal;
    });

    $ionicModal.fromTemplateUrl('login-modal.html', {
        scope: $scope,
        animation: 'slide-in-up'
    }).then(function(modal) {
        $scope.modalLogin = modal;
    });


    vm.login = function() {
        $scope.modalLogin.show();
        console.log('Login')
    }

    vm.logout = function() {
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        vm.loggedIn = false
    }

    /**
     * Check in and check out QR code generator
     * @param action
     */
    vm.checkIOQr = function(action) {
        var actionText = ''
        vm.string = btoa(Date.now() + ';' + action +';' + $cordovaDevice.getUUID()); //sends terminal device ID
        // vm.string = btoa(Date.now() + ';' + action +';1');

        if(action === '01') {
            actionText = 'in';
        } else if (action === '02') {
            actionText = 'out';
        }

        vm.title = 'Checking ' + actionText
        $scope.modalQr.show();
    }

    $scope.closeModalQr = function() {
        $scope.modalQr.hide();
    };
    // Cleanup the modal when we're done with it!
    $scope.$on('$destroy', function() {
        $scope.modalQr.remove();
        $scope.modalLogin.remove();
    });

    $scope.closeModalLogin = function() {
        $scope.modalLogin.hide();
    };

    /**
     * Login function
     */
    vm.submitLogin = function () {
        var data = JSON.stringify({username:vm.user.username, password: vm.user.password, terminal_id: 1})

        $http.post(vm.baseURL + '/api/v1/auth/login', data)
            .then(function(r){
                vm.username = r.data.results.user.username

                localStorage.setItem('token', r.data.results.user.token_hash)
                localStorage.setItem('username', vm.username)

                vm.loggedIn = true
                if(r.status === 200){
                    $cordovaToast.show('You have successfully login to Attendeng', 'short', 'bottom')
                    $scope.modalLogin.hide();
                } else {
                    $cordovaToast.show(r.data.response.message, 'short', 'bottom')
                }
            }, function (err) {
                $cordovaToast.show(err.header, 'long', 'bottom')
                // console.log(err)
            })
    }

    /**
     *
     */
    vm.scanCode = function (action) {
        $cordovaBarcodeScanner
            .scan()
            .then(function (barcodeData) {

                var qrcode = String(atob(barcodeData.text))
                var params = qrcode.split(';')

                if (params[1] === action) {

                    vm.transaction = {
                        "transaction" : {
                            "terminal_time": parseInt(params[0]),
                            "action": params[1],
                            "terminal_id": params[2],
                            "user_token": localStorage.getItem('token'),
                            "device_id": $cordovaDevice.getUUID(),
                            "device_time": Date.now()
                        }
                    }

                    vm.timeDiff = parseInt(params[0]) - Date.now();

                    if (vm.timeDiff < 60000) {
                        vm.addLogToDatabase(vm.transaction)
                        $cordovaToast.show('Success!', 'long', 'bottom')
                    } else {
                        $cordovaToast.show('Expired QR code', 'long', 'bottom')
                    }

                } else {
                    $cordovaToast.show('Wrong action', 'short', 'bottom')
                }

            }, function (err) {
                // An error occurred
                $cordovaToast.show('Error:' + err.message, 'short', 'bottom')
            });
    }

    vm.addLogToDatabase = function (data) {

        $http.post(vm.baseURL + '/api/v1/transaction/create', data)
            .then(function (r) {
                $cordovaToast.show(r.data.message, 'long', 'bottom')
            }, function (err) {
                $cordovaToast.show('Error:' + err.message, 'short', 'bottom')
            })
    }

    vm.enableTerminalMode = function() {
        vm.terminal_mode = true
        $cordovaToast.show('enabled terminal mode', 'long', 'bottom')
    }


}