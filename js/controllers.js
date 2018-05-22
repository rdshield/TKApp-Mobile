angular.module('app.controllers', ['aws.cognito.identity', 'DBClient', 'ngMessages', ])

.controller('loginCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory','StorageService',
// The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
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
			console.log('1')
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
			$state.go('select_Child', {load: true,}, {reload:true});
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
 
.controller('createANewAccountCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
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
		  
		  console.log(info);
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

.controller('accountConfirmationCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	console.log($stateParams);
	$scope.error = { message: null };
	$scope.user = {};
	$scope.user.email = $stateParams.email;
	
	$scope.confirmAccount = function() {
		awsCognitoIdentityFactory.confirmAccount($scope.user.email, $scope.user.confirmCode, function(err) {
			if(!err) {
				$scope.error.message = "Your account has been successfully validated. Please login to complete setup.";
				setTimeout(function(){ $state.go('login',{}, {reload: true}); },3000);
			}
			else {
				console.log(err);
				$scope.error.message = err.message + ". Please try again.";
			}
		})
		
	}
}])

.controller('select_ChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',  // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName

// Get Sub = awsCognitoIdentityFactory.getSub()
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	//console.log($scope.$storage)
	$scope.error = { message: null};

	$scope.$on('$stateChangeSuccess', function() {
		$scope.getChildren();
	});

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
		$state.go('tabsController.missions',{}, {});
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
 
.controller('addAChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',// The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
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
			//console.log($scope);
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
				disChallenges:	[],
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
 
.controller('missionsCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',// The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
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
		DBClientFactory.readItems('challenges').then( function(result) {
			console.log($scope.$storage);
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
						//console.log(result);
						currChallenges.push(result[0]);
					}
				}
				
				var complChallenges = [];
				compLength = $scope.$storage.completedChallenges.length;
				for(var i=0; i<compLength; i++) {
					var result = $scope.$storage.challenges.filter(function( obj ) { return obj.challengeId == $scope.$storage.completedChallenges[i] });
					if(result.length != 0) {
						//console.log(result);
						complChallenges.push(result[0]);
					}
				}
				$scope.add("currentChallenges",currChallenges);
				$scope.add("completedChallenges",complChallenges);
				$state.go('tabsController.missions',{},{reload:true});
			}
		});
	}
	
	$scope.selectMission = function(mission,type) {
		$scope.add('mission',mission);
		$scope.add('missionType',type);
		$state.go('tabsController.missionBriefing',{mission,type}, {reload:true});
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
   
.controller('addMission', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	$scope.challenges= [];

	$scope.setupChallenges = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.getChallenges();
	}
	
	$scope.getChallenges = function() {
		length = $scope.$storage.challenges.length;
		for(var i=0;i<length;i++) {
			if($scope.$storage.currentChallenges.indexOf($scope.$storage.challenges[i].challengeId) == -1) {
				$scope.challenges.push($scope.$storage.challenges[i]);
			}
		}
	}
	
	$scope.selectMission = function(mission) {
		$scope.add('mission',mission);
		$scope.add('missionType',0);
		$state.go('tabsController.missionBriefing',{}, {});
	}


	function getUserFromLocalStorage(){
    awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) $state.go('addMission', {}, {reload: true})
      });
    }
			
}])

.controller('missionBriefingCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory','StorageService', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };

	$scope.setupMissionView = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.setupMission();
	}
	
	$scope.setupMission = function() {
		//console.log($scope.$storage);
	}

	$scope.acceptMission = function() {
		$scope.$storage.child.currChallenges.push($scope.$storage.mission.challengeId);
		$scope.$storage.currentChallenges.push($scope.$storage.mission);
		//console.log($scope.$storage);
		DBClientFactory.updateItem({	
				TableName: 'child',
				Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'currChallenges'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.currChallenges,},
		});
		$scope.setupMission();
		$state.go('tabsController.missions',{}, {reload: true});	
	}
	
	$scope.submitMission = function() {
		console.log('submit')
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
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'currChallenges'},
				ExpressionAttributeValues: { ':x' : temp,},
		});	
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
// The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
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
   
.controller('badgesCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
      
.controller('welcomeCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {
    

}])
  
.controller('challenge_SubmittedCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])