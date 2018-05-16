angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    

      .state('tabsController.missions', {
    url: '/page2',
    views: {
      'tab1': {
        templateUrl: 'templates/missions.html',
        controller: 'missionsCtrl'
      }
    }
  })

  .state('tabsController.profile', {
    url: '/page3',
    views: {
      'tab2': {
        templateUrl: 'templates/profile.html',
        controller: 'profileCtrl'
      }
    }
  })

  .state('tabsController.badges', {
    url: '/page4',
    views: {
      'tab3': {
        templateUrl: 'templates/badges.html',
        controller: 'badgesCtrl'
      }
    }
  })

  .state('tabsController', {
    url: '/page1',
    templateUrl: 'templates/tabsController.html',
    abstract:true
  })

  .state('welcome', {
    url: '/welcome',
    templateUrl: 'templates/welcome.html',
    controller: 'welcomeCtrl'
  })

  .state('login', {
    url: '/Login',
    templateUrl: 'templates/login.html',
    controller: 'loginCtrl'
  })

  .state('tabsController.missionBriefing', {
    url: '/page9',
    views: {
      'tab1': {
        templateUrl: 'templates/missionBriefing.html',
        controller: 'missionBriefingCtrl'
      }
    }
  })

  .state('select_Child', {
    url: '/page10',
    templateUrl: 'templates/select_Child.html',
    controller: 'select_ChildCtrl'
  })

  .state('challenge_Submitted', {
    url: '/page11',
    templateUrl: 'templates/challenge_Submitted.html',
    controller: 'challenge_SubmittedCtrl'
  })

  .state('createANewAccount', {
    url: '/page15',
    templateUrl: 'templates/createANewAccount.html',
    controller: 'createANewAccountCtrl'
  })
  
   .state('accountConfirmation', {
	cache: false,
    url: '/page12',
    templateUrl: 'templates/accountConfirmation.html',
    controller: 'accountConfirmationCtrl'
  })


$urlRouterProvider.otherwise('/Login')


});