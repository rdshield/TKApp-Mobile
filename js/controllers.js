angular.module('app.controllers', ['aws.cognito.identity', 'DBClient', 'ngMessages', 'ionic' ])

.controller('loginCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory','StorageService',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, $stateParams, awsCognitoIdentityFactory,StorageService) {
	$scope.$storage = StorageService.getAll();
    $scope.user = { email: "", password: "" };
    $scope.error = { message: null };
	
	$scope.setupPage = function() {
		//StorageService.add('things',['alpha']);
		$scope.getUserFromLocalStorage();	
	}

	$scope.getUserFromLocalStorage = function() {
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
			$scope.error.message = err.message;
			return false;
        } else {
			if(isValid) { $state.go('select_Child', {}, {reload: true}) }
			else {	StorageService.resetToDefault(); 
			}
		}
      });
    }
	
	$scope.signIn = function(login) {
		$scope.user.email = $scope.user.email.toLowerCase();
		if($scope.user.email == "" || $scope.user.password == "")
		{
			$scope.error.message = "Both Username and Password are required."
			$scope.$apply();
			return false;
		} else {
			awsCognitoIdentityFactory.signIn($scope.user.email, $scope.user.password, function(err) {
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
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	$scope.user = {};

    $scope.error = {
		message: null
    };

	$scope.register = function() {
	  if ($scope.user.pass1 !== $scope.user.pass2) {
			//errorHandler('The passwords entered do not match');
			$scope.error.message = 'The passwords entered do not match';
			$scope.$apply();
			return false;
	  }		
	  $scope.user.email = $scope.user.email.toLowerCase();	  
      awsCognitoIdentityFactory.signUp($scope.user.email, $scope.user.email, $scope.user.pass1,
        function(err, result) {
          if(err) {
            errorHandler(err);
            return false;
          }
			
		  info = { 'email': $scope.user.email };
          //$scope.$apply();
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
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	$scope.error = { message: null };
	$scope.user = {};
	$scope.user.email = $stateParams.email;
	
	$scope.confirmAccount = function() {
		awsCognitoIdentityFactory.confirmAccount($scope.user.email, $scope.user.confirmCode, function(err) {
			if(!err) {
				$scope.error.message = "Your account has been successfully validated. Please login to complete setup.";
				setTimeout(function(){ $state.go('login',{}, {reload:true}); },3000);
			}
			else {
				console.log(err);
				$scope.error.message = err.message + ". Please try again.";
			}
		})
	}
}])

.controller('select_ChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',  
// TIP: Access Route Parameters for your page via $stateParams.parameterName
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
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };	
	$scope.user = {};
	
	$scope.setupPage = function() {
		$scope.getUserFromLocalStorage();	
	}
	
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
				childId:		(sub +":"+ childCount),
				Id:				childCount,
				childName:		$scope.user.childName,
				childGrade: 	$scope.user.childGrade,
				childGender:    $scope.user.childGender,
				complChallenges:[],
				currChallenges: [],
				points:			[],
				badges:			[],
				parentId:		sub,
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
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		if($scope.$storage.child == {}) { 
			$state.go('select_Child') 			
		}
		else {
			$scope.getChallenges();
		}
	}
	
	$scope.getChallenges = function() {
		DBClientFactory.readItems('challengeCategory').then( function(result) {
			function compare(a,b){
				comparison = 0;
				if (a.categoryId > b.categoryId) {
					comparison = 1;
				} else if (b.categoryId > a.categoryId) {
					comparison = -1;
				}
				return comparison;
			};
			var a = result.Items.sort(compare);
			$scope.add('categories', a);
		});
		
		DBClientFactory.readItems('missionBadges').then( function(result) {
			function compare(a,b){
				comparison = 0;
				if (a.badgeId > b.badgeId) {
					comparison = 1;
				} else if (b.badgeId > a.badgeId) {
					comparison = -1;
				}
				return comparison;
			};
			var a = result.Items.sort(compare);
			$scope.add('possibleBadges', a);
		});
		
		
		DBClientFactory.readItems('challenges').then( function(result) {
			var $redo= (($scope.$storage.currentChallenges.length==0)&&($scope.$storage.completedChallenges.length==0))
			if($redo) {
				$scope.add('challenges',result.Items); 
				$scope.add('currentChallenges', ($scope.$storage.child.currChallenges) );
				$scope.add('completedChallenges', ($scope.$storage.child.complChallenges) );
				
				var currChallenges = [];
				currLength = $scope.$storage.currentChallenges.length;
				for(var i=0; i<currLength; i++) {
					var result = $scope.$storage.challenges.filter(function( obj ) { return obj.challengeId == $scope.$storage.currentChallenges[i] });
					if(result.length != 0) {
						currChallenges.push(result[0]);
					}
				}
				
				var complChallenges = [];
				compLength = $scope.$storage.completedChallenges.length;
				for(var i=0; i<compLength; i++) {
					var result = $scope.$storage.challenges.filter(function( obj ) { return obj.challengeId == $scope.$storage.completedChallenges[i] });
					if(result.length != 0) {
						var today = new Date();
						var d= today.getDate();
						var m= today.getMonth()+1;
						var y= today.getFullYear();
						if(d<10) { d= '0' + d};
						if(m<10) { m= '0' + m};
						today = m + '/' + d + '/' + y;
						result[0].completeDate = today;
						complChallenges.push(result[0]);
					}
				}
				$scope.add("currentChallenges",currChallenges);
				$scope.add("completedChallenges",complChallenges);
				$state.go('tabsController.missions',{},{reload:true});
			}
			$scope.getBadges();
		});
		
	}
	
	$scope.getBadges = function(){	
		$points = $scope.$storage.child.points;	
		$badgeCount = $scope.$storage.child.badges;
		$categories = $scope.$storage.categories;
		
		result = [];
		for(var i=0;i<$badgeCount.length;i++) {
			if($badgeCount[i] > 0) {
				for(var j=0;j<$badgeCount[i];j++) {
					result.push(badgeIds = $categories[i].badges[j]);
				}
			}
		}
		$scope.add('badges',result);
	}
	
	$scope.selectMission = function(mission,type) {
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
	$scope.challenges= [];

	$scope.goBack = function(){
		$state.go('tabsController.missions',{}, {reload:true});
	};
	
	$scope.setupChallenges = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.getChallenges();
	}
	
	$scope.getChallenges = function() {
		$scope.$storage.availableChallenges = [];
		length = $scope.$storage.challenges.length;
		var idArray = $scope.$storage.currentChallenges.map(function (el) { return el.challengeId; });
		for(var i=0;i<length;i++) {
			if($scope.$storage.challenges[i].isActive && (idArray.indexOf($scope.$storage.challenges[i].challengeId) == -1)) {
				$scope.$storage.availableChallenges.push($scope.$storage.challenges[i]);
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
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService, $ionicHistory) {
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
		$scope.$storage.child.currChallenges.push($scope.$storage.mission.challengeId);
		$scope.$storage.currentChallenges.push($scope.$storage.mission);
		$scope.$storage.availableChallenges.splice($scope.$storage.availableChallenges.indexOf($scope.$storage.mission),1)
		DBClientFactory.updateItem({	
				TableName: 'child',
				Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'currChallenges'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.currChallenges,},
		});
		$state.go('tabsController.missions',{}, {reload: true,});	
	}
	
	$scope.submitMission = function() {
		var temp = $scope.$storage.child.complChallenges;
		temp.unshift($scope.$storage.mission.challengeId);
		if(temp.length > 5) { temp.pop(); }
		var today = new Date();
		var d= today.getDate();
		var m= today.getMonth()+1;
		var y= today.getFullYear();
		if(d<10) { d= '0' + d};
		if(m<10) { m= '0' + m};
		today = m + '/' + d + '/' + y;
		$scope.cancelMission();
		compMission = $scope.$storage.mission;
		compMission.completeDate = today;
		$scope.$storage.completedChallenges.unshift(compMission);
		if($scope.$storage.completedChallenges.length > 5) {
			$scope.$storage.completedChallenges.pop();
		}
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'complChallenges'},
				ExpressionAttributeValues: { ':x' : temp,},
		});
		var $points = $scope.$storage.child.points;
		var index = $scope.$storage.mission.categoryId-1;
		$points[index] = $points[index] + compMission.value;
		b = $scope.$storage.categories[index].levels;		
		$badges = $scope.$storage.child.badges[index];
		
		for(var i=$badges;i<b.length;i++) {
			if($points[$scope.$storage.mission.categoryId-1]>=b[i]) {
				$scope.$storage.child.badges[index] = $scope.$storage.child.badges[index]+1;
			}
		}
		$scope.getBadges();
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
	}
	
	$scope.getBadges = function(){	
		$points = $scope.$storage.child.points;	
		$badgeCount = $scope.$storage.child.badges;
		$categories = $scope.$storage.categories;
		
		result = [];
		for(var i=0;i<$badgeCount.length;i++) {
			if($badgeCount[i] > 0) {
				for(var j=0;j<$badgeCount[i];j++) {
					result.push(badgeIds = $categories[i].badges[j]);
				}
			}
		}
		$scope.add('badges',result);
	}
	
	$scope.cancelMission = function() {
		chal = $scope.$storage.currentChallenges;
		var temp = [];
		var curr = [];
		for(var i=0;i<chal.length;i++) {
			if(chal[i].challengeId != $scope.$storage.mission.challengeId) {
				temp.push(chal[i].challengeId);
				curr.push(chal[i]);
			}	
		}
		$scope.add('currentChallenges',curr);
		$scope.$storage.child.currChallenges = temp;
		$scope.$storage.availableChallenges.push($scope.$storage.mission);
		// DBClientFactory.updateItem({	
			// TableName: 'child',
			// Key: { 'childId': $scope.$storage.child.childId },
				// UpdateExpression: 'set #a = :x',
				// ExpressionAttributeNames: {'#a': 'currChallenges'},
				// ExpressionAttributeValues: { ':x' : temp,},
		// });	
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
	console.log($scope.$storage)


}])
      
.controller('challenge_SubmittedCtrl', ['$scope', '$stateParams',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])