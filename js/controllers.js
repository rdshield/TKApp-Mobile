angular.module('app.controllers', ['aws.cognito.identity', 'DBClient', 'ngMessages', ])

.controller('loginCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, $stateParams, awsCognitoIdentityFactory) {
    $scope.user = { email: "", password: "" };
    $scope.error = { message: null };

	$scope.getUserFromLocalStorage = function() {
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) $state.go('select_Child', {}, {reload: true})
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
	
	$scope.userLogged = function() {
      if(awsCognitoIdentityFactory.ifUserLogged) {
        $stateParams.go('select_Child', {}, {reload: true});
      }
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

.controller('select_ChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory',  // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName


// Get Sub = awsCognitoIdentityFactory.getSub()
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory) {
	$scope.error = { message: null};

	$scope.$on('$stateChangeSuccess', function() {
		$scope.getChildren();
	});
	
	
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		if($scope.children == null) {	$scope.children = [];	}
		$scope.getChildren();
	}
	
	$scope.getChildren = function() {
		console.log("Getting Children");
		DBClientFactory.readItems('child','parentId = :thisParent', {':thisParent': awsCognitoIdentityFactory.getSub() }).then(function(result) {
			//console.log(result);
			$scope.children = result.Items;
		});
	}
	
	function getUserFromLocalStorage(){
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) $state.go('select_Child', {}, {reload: true})
      });
    }	
	
	$scope.selectChild = function(child) {
		AWS.config.child = child;
		$state.go('tabsController.missions',{child}, {reload: true});
	}

}])
 
.controller('addAChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory) {
	$scope.user = {};
	$scope.getUserFromLocalStorage = function() {
      awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) { $state.go('select_Child', {}) }
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
				//disChallenges:[],
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
			console.log($scope);
			$state.go("select_Child", {}, {});
		});

	}

}])
 
.controller('missionsCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory) {
	$scope.child = {};
	$scope.challenges = [];
	$scope.currChallenges = [];
	$scope.compChallenges = [];
	$scope.disChallenges = [];
	
	$scope.getChallenges = function() {
		a = DBClientFactory.readItems('challenges').then( function(result) {
			//console.log(result);
			$scope.challenges = result.Items;
			b = $scope.child.currChallenges.values;
			currLength = $scope.child.currChallenges.values.length;
			 for(var i=0; i<currLength; i++) {
				var result = $scope.challenges.filter(function( obj ) { return obj.challengeId == b[i]; });
					$scope.currChallenges.push(result[0]);
			 }
			 
			c = $scope.child.compChallenges.values;
			compLength = $scope.child.compChallenges.values.length;
			 for(var i=0; i<compLength; i++) {
				var result = $scope.challenges.filter(function( obj ) { return obj.challengeId == c[i]; });
					$scope.compChallenges.push(result[0]);
			 }
			 
			d = $scope.child.disChallenges.values;
			disLength = $scope.child.disChallenges.values.length;
			 for(var i=0; i<disLength; i++) {
				var result = $scope.challenges.filter(function( obj ) { return obj.challengeId == d[i]; });
					$scope.disChallenges.push(result[0]);
			 }
		});
	}
	
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.getChallenges();
	}

	function getUserFromLocalStorage(){
    awsCognitoIdentityFactory.getUserFromLocalStorage(function(err, isValid) {
        if(err) {
          $scope.error.message = err.message;
          return false;
        }
        if(isValid) $state.go('tabsController.missions', {}, {reload: true})
      });
    }
}])
   
.controller('profileCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


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
  
.controller('missionBriefingCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   

   
.controller('challenge_SubmittedCtrl', ['$scope', '$stateParams', // The following is the constructor function for this page's controller. See https://docs.angularjs.org/guide/controller
// You can include any angular dependencies as parameters for this function
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])
   

 