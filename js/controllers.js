//Serves as the primary logic for the app. Each Controller connects to the template, as noted in the "routes.js"

angular.module('app.controllers', ['aws.cognito.identity', 'DBClient', 'ngMessages'])

.controller('loginCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory','StorageService',

function ($scope, $state, $stateParams, awsCognitoIdentityFactory,StorageService) {
	$scope.$storage = StorageService.getAll();
    $scope.error = { message: null };
	$scope.user = { email: "", password: "" };
	
	$scope.setupPage = function() {	$scope.getUserFromLocalStorage(); }

	$scope.getUserFromLocalStorage = function() {
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
			$scope.error.message = err.message;
			return false;
        } else {
			if(isValid) { $state.go('select_Child', {}, {reload: true}) }
			else {	StorageService.resetToDefault(); }
		}
      });
    }
	
	$scope.signIn = function(login) {
		$scope.user.email = $scope.user.email.toLowerCase();
		if($scope.user.email == "")
		{
			$scope.error.message = "Please provide a valid email account to sign in."
			$scope.$apply();
			return false;
		} else if($scope.user.password == "" ){
			$scope.error.message = "A password is required for proper login."
			$scope.$apply();
			return false;
		} else {
			awsCognitoIdentityFactory.signIn($scope.user.email, $scope.user.password, function(err) {
			$scope.user.password = "";
			if(err) {
			  console.log(err);
			  if (err.message === 'Incorrect username or password.') {
				$scope.error.message = err.message + ' Have you confirmed your account?'
			  }
			  else if (err.message === 'User does not exist.') {
				$scope.error.message = ' No Account found for ' + $scope.user.email
			  }
			  else {
				$scope.error.message = err.message;
			  }
			  $scope.$apply();
			  return false;
			}
			clearForm(login)
			console.log("Login Successful");
			$state.go('select_Child', {}, {reload:true});
			})
		}
    }
	
	$scope.goToConfirm = function(){
		$state.go('accountConfirmation',{ 'email': ""});
		clearForm(login);
	}
	
    var clearForm = function(login) {
      $scope.user = { email: '', password: '' }
    }
}])
 
.controller('createANewAccountCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	$scope.user = {};
	$scope.states = ['AK','AL','AR','AZ','CA','CO','CT','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY']
    $scope.error = { message: null };
	
	$temp = document.getElementById('stateSelect');
	for(var i=0;i<$scope.states.length;i++) {
		$temp.insertAdjacentHTML('beforeend',("<option value="+$scope.states[i]+ ">" +$scope.states[i]+" </option>"))
	}
	
	$scope.register = function() {
		if ($scope.user.pass1 !== $scope.user.pass2) {
			$scope.error.message = 'The passwords provided  do not match';
			$scope.$apply();
			return false;
		}
		$scope.user.email = $scope.user.email.toLowerCase();	  
		awsCognitoIdentityFactory.signUp($scope.user.email, $scope.user, function(err, result) {
			if(err) {
				errorHandler(err);
				return false;
			}
			$scope.user = {}; //clear register form
			$state.go('accountConfirmation', info);
		});
		return true;
    }

    errorHandler = function(err) {
      console.log(err);
      $scope.error.message = err.message;
      $scope.$apply();
    }
}])

.controller('accountConfirmationCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	$scope.error = { message: null };
	$scope.user = {};
	$scope.user.email = $stateParams.email;
	
	$scope.confirmAccount = function() {
		awsCognitoIdentityFactory.confirmAccount($scope.user.email, $scope.user.confirmCode, function(err) {
			if(!err) {
				$scope.error.message = "Your account has been successfully validated. Please login to complete setup.";
				setTimeout(function(){ $state.go('login',{}, {reload:true}); },5000);
			} else {
				console.log(err);
				$scope.error.message = err.message + ". Please try again.";
			}
		})
	}
}])

.controller('select_ChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',  

function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	$scope.error = { message: null};

	$scope.$on('$stateChangeSuccess', function() { $scope.getChildren(); });

	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		$scope.getChildren();
	}
	
	$scope.getChildren = function() {
		DBClientFactory.readItems('child','parentId = :thisParent', {':thisParent': awsCognitoIdentityFactory.getSub() }).then(function(result) {
			$scope.add('children',result.Items);
		});
	}

	$scope.selectChild = function(child) {
		$scope.add('child', child);
		$state.go('tabsController.missions',{}, {reload:true});
	}

	function getUserFromLocalStorage(){
		awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
			if(err) {
				$scope.error.message = err.message;
				return false;
			}
			$scope.AWS = AWS.config;
		});
    }	
}])
 
.controller('addAChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };	
	$scope.user = {};
	$scope.setupPage = function() { $scope.getUserFromLocalStorage();	}
	$scope.getUserFromLocalStorage = function() {
		awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
			if(err) {
				$scope.error.message = err.message;
				return false;
			}
		});
    }

	$scope.addChild = function() {
		sub = AWS.config.sub;
		DBClientFactory.readItem(DBClientFactory.getDeleteParameters('user',{'userId': sub})).then(function(a) {
			childCount = a.userCount+1;
			temp = $scope.user.childName;
			$scope.user.childName = (temp.substring(0,1).toUpperCase() + temp.substring(1,temp.length).toLowerCase()); 
			var params = {
				childId:			(sub +":"+ childCount),
				Id:					childCount,
				childName:			$scope.user.childName,
				childGrade: 		$scope.user.childGrade,
				childGender:    	$scope.user.childGender,
				completedMissions:  [],
				currentMissions: 	[],
				badges: 			[],
				points:				[],
				parentId:			sub,
			}
			var param = DBClientFactory.getParameters('child',params);
			DBClientFactory.writeItem(param);
			DBClientFactory.updateItem({	
				TableName: 'user',
				Key: { 'userId': sub },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'userCount'},
					ExpressionAttributeValues: { ':x' : childCount,},
			});
			$state.go("select_Child", {}, {reload:true});
		});
	}
}])
 
.controller('missionsCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		if($scope.$storage.child == {}) { $state.go('select_Child') }
		else {	$scope.getMissions();	}
		
	}
	
	$scope.getMissions = function() {
		//console.log($scope.$storage)
		DBClientFactory.readItems('categories').then( function(result) {
			function compare(a,b){
				comparison = 0;
				if (a.categoryId > b.categoryId) {
					comparison = 1;
				} else if (b.categoryId > a.categoryId) {
					comparison = -1;
				}
				return comparison;
			};
			$scope.add('categories', result.Items.sort(compare));
			
			if($scope.$storage.child.badges.length < $scope.$storage.categories.length) {
				for(var i=$scope.$storage.child.badges.length;i<$scope.$storage.categories.length;i++) {
					$scope.$storage.child.badges.push(0);
				}
				DBClientFactory.updateItem({	
					TableName: 'child',
					Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'badges'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.badges,},
				});	
			}
			
			if($scope.$storage.child.points.length < $scope.$storage.categories.length) {
				for(var i=$scope.$storage.child.points.length;i<$scope.$storage.categories.length;i++) {
					$scope.$storage.child.points.push(0);
				}
				DBClientFactory.updateItem({	
					TableName: 'child',
					Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'points'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.points,},
				});	
			}
		});
		
		DBClientFactory.readItems('missions').then( function(result) {
			console.log($scope.$storage);
			function compare(a,b){
				comparison = 0;
				if (a.missionId > b.missionId) {
					comparison = 1;
				} else if (b.missionId > a.missionId) {
					comparison = -1;
				}
				return comparison;
			};
			$scope.add('missions', result.Items.sort(compare));
			$scope.add('currentMissions', ($scope.$storage.child.currentMissions) );
			$scope.add('completedMissions', ($scope.$storage.child.completedMissions) );
			var currMissions = [];
			for(var i=0; i<$scope.$storage.missions.length; i++) {
				var result = $scope.$storage.missions.filter( function( obj ) { return obj.missionId == $scope.$storage.currentMissions[i] });
				if(result.length != 0) {
					currMissions.push(result[0]);			
				}
			}
			$scope.add('currentMissions',currMissions);
			$scope.add('completedMissions', $scope.$storage.child.completedMissions);
			$scope.$storage.timesRun++;
			if($scope.$storage.timesRun==1) { $state.go('tabsController.missions',{},{reload:true}); }
			$scope.getBadges(); 
		});
	}
	
	$scope.getBadges = function(){
		$badgeCount = $scope.$storage.child.badges;
		$categories = $scope.$storage.categories;
		
		result = [];
		for(var i=0;i<$categories.length;i++) {
			if($badgeCount[i] > 0) {
				result.push($scope.$storage.categories[i].badges[$badgeCount[i]-1]);
			}
			else {
				result.push(null);
			}
		}
		$scope.add('badges',result);
	}
	
	$scope.selectMission = function(mission,type) {
		console.log($scope.$storage);
		$scope.add('mission',mission);
		$scope.add('missionType',type);
		$state.go('missionBriefing',{}, {});
	}

	function getUserFromLocalStorage(){
		awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
			if(err) {
			  $scope.error.message = err.message;
			  return false;
			}
		});
    }
}])
   
.controller('addMission', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService', 
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };

	$scope.goBack = function(){
		$state.go('tabsController.missions',{}, {reload:true});
	};
	
	$scope.setupChallenges = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.getChallenges();
	}
	
	$scope.getChallenges = function() {
		length = $scope.$storage.missions.length;
		var idArray = $scope.$storage.currentMissions.map(function (el) { return el.missionId; });
		var availableIdArray = $scope.$storage.availableMissions.map(function (el) { return el.missionId; });
		for(var i=0;i<length;i++) {
			if($scope.$storage.missions[i].isActive && 
			  (idArray.indexOf($scope.$storage.missions[i].missionId) == -1) &&
			  (availableIdArray.indexOf($scope.$storage.missions[i].missionId) == -1)) {
				$scope.$storage.availableMissions.push($scope.$storage.missions[i]);
			}
		}
	}
	
	$scope.selectMission = function(mission) {
		$scope.add('mission',mission);
		$scope.add('missionType',0);
		$state.go('missionBriefing',{}, {reload:true});
	}

	function getUserFromLocalStorage(){
		awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
			if(err) {
			  $scope.error.message = err.message;
			  return false;
			}
			if(isValid) {}
		  });
    }			
}])

.controller('missionBriefingCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory','StorageService', 
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	$scope.goBack = function(){
		if ($scope.$storage.missionType==0) { $state.go('addMission',{}, {reload:true}); }
		else { $state.go('tabsController.missions',{}, {reload:true}); }
	};
	
	$scope.setupMissionView = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
	}

	$scope.acceptMission = function() {
		$scope.$storage.child.currentMissions.push($scope.$storage.mission.missionId);
		$scope.$storage.currentMissions.push($scope.$storage.mission);
		$scope.$storage.availableMissions.splice($scope.$storage.availableMissions.indexOf($scope.$storage.mission),1)
		DBClientFactory.updateItem({	
				TableName: 'child',
				Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'currentMissions'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.currentMissions,},
		});
		$state.go('tabsController.missions',{}, {reload: true,});	
	}
	
	$scope.submitMission = function() {
		
		var today = new Date();
		var d= today.getDate();
		var m= today.getMonth()+1;
		var y= today.getFullYear();
		if(d<10) { d= '0' + d};
		if(m<10) { m= '0' + m};
		today = m + '/' + d + '/' + y;
		completedMission = $scope.$storage.mission;
		completedMission.completeDate = today;
		var temp = $scope.$storage.child.completedMissions;
		temp.unshift(completedMission);

		if(temp.length > 5) { temp.pop(); }
		if($scope.$storage.completedMissions.length > 5) {$scope.$storage.completedMissions.pop();}
		 DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'completedMissions'},
				ExpressionAttributeValues: { ':x' : temp,},
		});
		
		var $points = $scope.$storage.child.points;
		var index = $scope.$storage.mission.categoryId;		console.log(index);
		$points[index] = parseInt($points[index]) + parseInt(completedMission.value);

		var pLevels = $scope.$storage.categories[index].levels;		
		$badges = $scope.$storage.child.badges[index];
		for(var i=$badges;i<pLevels.length;i++) {
			if($points[index]>=pLevels[i] && $badges<pLevels.length) {
				$scope.$storage.child.badges[index] = parseInt($scope.$storage.child.badges[index]+1);
			}
		}
		
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'points',},
				ExpressionAttributeValues: { ':x' : $scope.$storage.child.points,},
		});			
		
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #b = :y',
				ExpressionAttributeNames: {'#b': 'badges',},
				ExpressionAttributeValues: {':y' : $scope.$storage.child.badges },
		});
		$scope.cancelMission()
		$scope.getBadges();
		$state.go('tabsController.missions',{}, {reload: true});
	}
	
	$scope.getBadges = function(){
		$badgeCount = $scope.$storage.child.badges;
		$categories = $scope.$storage.categories;
		
		result = [];
		for(var i=0;i<$categories.length;i++) {
			if($badgeCount[i] > 0) {
				result.push($scope.$storage.categories[i].badges[$badgeCount[i]-1]);
			}
			else {
				result.push(null);
			}
		}
		$scope.add('badges',result);
	}
	
	$scope.cancelMission = function() {
		missionsInProgress = $scope.$storage.child.currentMissions;
		missionsInProgress.splice(missionsInProgress.indexOf($scope.$storage.mission.missionId),1);
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'currentMissions'},
				ExpressionAttributeValues: { ':x' : $scope.$storage.child.currentMissions,},
		});	
		$scope.add('mission',{});
		$scope.add('missionType',{});
		$scope.add('timesRun', 0);
		$state.go('tabsController.missions',{}, {reload: true});
	}

	function getUserFromLocalStorage(){
		awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
      });
    }

}])

.controller('profileCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory','StorageService',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, $stateParams, awsCognitoIdentityFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	
	$scope.exitChild = function() { 
		StorageService.resetToDefault();
		$state.go('select_Child',{},{reload:true});
	}
	
	$scope.exitGuardian = function() { 
		awsCognitoIdentityFactory.signOut();
		StorageService.resetToDefault();
		$state.go('login',{},{reloadState:true});
	}

}])
   
.controller('badgesCtrl', ['$scope', '$stateParams', 'StorageService',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, StorageService) {
	$scope.$storage = StorageService.getAll();
}])
      
.controller('challenge_SubmittedCtrl', ['$scope', '$stateParams',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])