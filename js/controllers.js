//Serves as the primary logic for the app. Each Controller connects to the template, as noted in the "routes.js"

angular.module('app.controllers', ['aws.cognito.identity', 'DBClient', 'ngMessages'])
 
// Default page on App Start - Login Page
.controller('loginCtrl', ['$scope','$state', '$stateParams', 'awsCognitoIdentityFactory','StorageService',

function ($scope, $state, $stateParams, awsCognitoIdentityFactory, StorageService) {
	//Used to Construct Local Storage across controllers/pages + functions to mutate storage
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
    //Set Default settings for error message and user account
	$scope.error = { message: null };
	$scope.user = { email: "", password: "" };
	
	//Sets Default settings for page(disable the commented to allow users to stay logged in)
	$scope.setupPage = function() {
			awsCognitoIdentityFactory.signOut();
			//StorageService.resetToDefault();
			//$scope.getUserFromLocalStorage();
	}
	
	//Checks Cognito and AWS credential settings to see if a user has already logged in. Note: Cognito token allows login up to one hour after first password with no way to invalidate
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
	
	// Runs on "Sign-in" button - Checks user information entered and either provides feedback on the issue, or sends sign-in to Cognito Factory
	$scope.signIn = function(login) {
		$scope.error = { message: null };
		$scope.user.email = $scope.user.email.toLowerCase(); //All accounts are shift to lower case to avoid duplicate (Username vs username vs USERNAME)
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
			clearForm(login) //Clears username and password stored on login screen before proceeding
			console.log("Login Successful");
			$state.go('select_Child', {}, {reload:true});
			})
		}
    }

	// Checks on "Confirm User Account" link - used to validate accounts after sign-up
	$scope.goToConfirm = function(){
		$state.go('accountConfirmation',{ 'email': ""});
		clearForm(login);
	}
	
    var clearForm = function(login) {
      $scope.user = { email: '', password: '' }
    }
}])

// Signup Screen for new Accounts - SignUp
.controller('createANewAccountCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams) {
	//Sets default settings for user information and State dropdown
	$scope.user = {};
	$scope.states = ['AK','AL','AR','AZ','CA','CO','CT','DE','FL','GA','HI','IA','ID','IL','IN','KS','KY','LA','MA','MD','ME','MI','MN','MO','MS','MT','NC','ND','NE','NH','NJ','NM','NV','NY','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VA','VT','WA','WI','WV','WY']
    $scope.error = { message: null };
	
	//Sets up Select Options for "State" on Sigup Page
	$temp = document.getElementById('stateSelect');
	for(var i=0;i<$scope.states.length;i++) {
		$temp.insertAdjacentHTML('beforeend',("<option value="+$scope.states[i]+ ">" +$scope.states[i]+" </option>"))
	}
	
	//Runs on "Signup" button submit - Checks provided information for potential issues and provides feedback. If it all checks out, it sends the Signup info to Cognito Factory
	//POSSIBLE UPGRADE AREA - Text Validation for user-provided information
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

// Account Confirmation Screen for Accounts After Signup - ConfirmUser
.controller('accountConfirmationCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams)  {
	//Used to Construct Local Storage across controllers/pages + functions to mutate storage
	$scope.error = { message: null };
	$scope.user = {};
	$scope.user.email = $stateParams.email; //If user was directed here from the signup screen, it will take their email address entered there and input it here
	
	//Takes User-entered Confirmation information and submits it to the Cognito Factory. Shows error if encountered, and activates account and sends back to login if verified
	$scope.confirmAccount = function() {
		awsCognitoIdentityFactory.confirmAccount($scope.user.email, $scope.user.confirmCode, function(err) {
			if(!err) {
				$scope.error.message = "Your account has been successfully validated. Please login to complete setup.";
				//Timeout to allow Cognito to propagate account confirmation (Can take 5-10 seconds)
				setTimeout(function(){ $state.go('login',{}, {reload:true}); },5000);
			} else {
				console.log(err);
				$scope.error.message = err.message + ". Please try again.";
			}
		})
	}
}])

// Page for selecting the child whose missions you are interacting with - Select Child
.controller('select_ChildCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',  

function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	$scope.error = { message: null};

	//Used for re-drawing child list after adding new children
	$scope.$on('$stateChangeSuccess', function() { $scope.getChildren(); });

	//Pulls credentials and sets up first view
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		$scope.getChildren();
	}
	
	//Pulls child array from DynamoDB and writes it into the LocalStorage
	$scope.getChildren = function() {
		DBClientFactory.readItems('child','parentId = :thisParent', {':thisParent': awsCognitoIdentityFactory.getSub() }).then(function(result) {
			$scope.add('children',result.Items);
		});
	}

	//Runs when child's selection is clicked, writes the selection into memory, and directs to the mission page
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
 
// Page for entering and adding children to a user's account
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

	//Takes user information and creates a new child account while updating required fields in the Database
	$scope.addChild = function() {
		sub = AWS.config.sub; //Unique key for Cognito user - used as parentId
		//Read index representing number of children user has made, using that to index the new child
		DBClientFactory.readItem(DBClientFactory.getDeleteParameters('user',{'userId': sub})).then(function(a) {
			childCount = a.userCount+1;
			temp = $scope.user.childName;
			//Takes parent user's account ID and child index and merges them - Serves as childId
			$scope.user.childName = (temp.substring(0,1).toUpperCase() + temp.substring(1,temp.length).toLowerCase()); 

			//Parameters needed for new account
			var params = {
				childId:			(sub +":"+ childCount),
				Id:					childCount,
				childName:			$scope.user.childName,
				childGrade: 		$scope.user.childGrade,
				childGender:    	$scope.user.childGender,
				completedMissions:  [],						//holds last 5 missions completed by the child - used on Mission control page
				currentMissions: 	[],						//holds missions currently in progress - used on Missions control page
				badges: 			[],						//holds Badge levels earned by child - Used on Badge viewing page
				points:				[],						//holds number of points child has earned to date - used in Badge Viewing and Mission submission
				parentId:			sub,
			}
			
			//Formats parameters for DynamoDB entry and writes them to the Database. Also updates user's account to increment the child user counter used above
			var param = DBClientFactory.getParameters('child',params);
			DBClientFactory.writeItem(param);
			DBClientFactory.updateItem({	
				TableName: 'user',
				Key: { 'userId': sub },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'userCount'},
					ExpressionAttributeValues: { ':x' : childCount,},
			});
			//Returns back to Child Selection Screen
			$state.go("select_Child", {}, {reload:true});
		});
	}
}])

// Page for showing missions (current and completed) - Main hub for child interaction - Mission Control
.controller('missionsCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService',

function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	
	//Setup the screen for first login
	$scope.setupLogin = function() {
		getUserFromLocalStorage();
		if($scope.$storage.child == {}) { $state.go('select_Child') } //Redirects if user gets to this page without selecting a child
		else {	$scope.getMissions();	}	
	}
	
	//Pulls Category information (updates child arrays if cats have been added) and mission info for use by rest of Mission-related screens
	$scope.getMissions = function() {
		//Pull index-sorted list from DynamoDB
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
			
			//Update badge and point indexs for children, if they don't match (Categories cannot be deleted, so new categories will always increase array length)
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
	
		//Pulls index-sorted list of available missions (total) from DynamoDB
		DBClientFactory.readItems('missions').then( function(result) {
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
			//Uses information stored in child object(pulled in Select Child) to populate arrays used for mission views
			$scope.add('currentMissions', ($scope.$storage.child.currentMissions) );
			$scope.add('completedMissions', ($scope.$storage.child.completedMissions) );
			
			//Translates missionIds to actual Missions for Mission Views
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
			if($scope.$storage.timesRun==1) { $state.go('tabsController.missions',{},{reload:true}); } //Resets the view if this is the first time running
			$scope.getBadges(); 
		});
	}
	
	//Pulls badge counts stored in DynamoDB and translates them into actual badge information (showed in Badge View)
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
	
	//Runs when mission is clicked on Mission Control - Mission is the mission clicked, type denotes the context of the click to Debriefing Page (new mission/accepted mission/completed mission)
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
   
// Page for child accepting new missions - Add a Mission
.controller('addMission', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory', 'StorageService', 
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };

	//Issue with built-in Back Buttons on tab views - Used to return to mission control
	$scope.goBack = function(){
		$state.go('tabsController.missions',{}, {reload:true});
	};
	
	//Setup Page on run and reload
	$scope.setupChallenges = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
		$scope.getMissions();
	}
	
	//Pulls Missions from original lists and leaves out missions already accepted, but not completed
	$scope.getMissions = function() {
		length = $scope.$storage.missions.length;
		var idArray = $scope.$storage.currentMissions.map(function (el) { return el.missionId; });
		var availableIdArray = $scope.$storage.availableMissions.map(function (el) { return el.missionId; });
		for(var i=0;i<length;i++) {
			// Levels of Requirements: 
			//     	1st- mission must be active on the Database (set by admins)
			//  	2nd- mission must not be currently in progress
			//		3rd- mission must be in list of "available" missions
			if($scope.$storage.missions[i].isActive && 
			  (idArray.indexOf($scope.$storage.missions[i].missionId) == -1) &&
			  (availableIdArray.indexOf($scope.$storage.missions[i].missionId) == -1)) {
				$scope.$storage.availableMissions.push($scope.$storage.missions[i]);
			}
		}
	}
	
	//Runs on Mission being clicked on - Passes to Mission briefing - (Type 0 indicates that it is not already accepted or completed)
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

// Page for displaying mission particulars - Mission Briefing
.controller('missionBriefingCtrl', ['$scope','$state','awsCognitoIdentityFactory', '$stateParams', 'DBClientFactory','StorageService', 
function ($scope, $state, awsCognitoIdentityFactory, $stateParams, DBClientFactory, StorageService) {
	$scope.$storage = StorageService.getAll();
	$scope.add = function (key, thing) { StorageService.add(key, thing); };
	
	//Issue with built-in Back Buttons on tab views - Used to return to mission control or Add Mission controls
	$scope.goBack = function(){
		if ($scope.$storage.missionType==0) { $state.go('addMission',{}, {reload:true}); }
		else { $state.go('tabsController.missions',{}, {reload:true}); }
	};
	
	$scope.setupMissionView = function() {
		getUserFromLocalStorage();
		$scope.child = AWS.config.child;
	}

	//Runs on "Accepting" of a mission
	$scope.acceptMission = function() {
		$scope.$storage.child.currentMissions.push($scope.$storage.mission.missionId);									//Add to current Mission list (id list)
		$scope.$storage.currentMissions.push($scope.$storage.mission);													//Add to current Mission that shows on Mission control
		$scope.$storage.availableMissions.splice($scope.$storage.availableMissions.indexOf($scope.$storage.mission),1)	//Remove Accepted mission from the available mission list
		//Update child current mission information on DynamoDB (to allow rebuild if user quits before submitting the mission)
		DBClientFactory.updateItem({	
				TableName: 'child',
				Key: { 'childId': $scope.$storage.child.childId },
					UpdateExpression: 'set #a = :x',
					ExpressionAttributeNames: {'#a': 'currentMissions'},
					ExpressionAttributeValues: { ':x' : $scope.$storage.child.currentMissions,},
		});
		$state.go('tabsController.missions',{}, {reload: true,});	
	}
	
	//Runs on "Submission" of a completed mission
	$scope.submitMission = function() {

		//Used for setting mission completion date (used in Mission Control)
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
		temp.unshift(completedMission); //shift mission (with completion date) into completed list
		//Verify if length of completed missions array is under limit(currently 5) - pop last element(oldest) if not
		if(temp.length > 5) { temp.pop(); }
		if($scope.$storage.completedMissions.length > 5) {$scope.$storage.completedMissions.pop();}
		//Update completed missions on DB for user
		DBClientFactory.updateItem({	
			TableName: 'child',
			Key: { 'childId': $scope.$storage.child.childId },
				UpdateExpression: 'set #a = :x',
				ExpressionAttributeNames: {'#a': 'completedMissions'},
				ExpressionAttributeValues: { ':x' : temp,},
		});
		
		//Updates point values for the mission's category
		var $points = $scope.$storage.child.points;
		var index = $scope.$storage.mission.categoryId;	
		$points[index] = parseInt($points[index]) + parseInt(completedMission.value);

		//Updates Levels for category(Upgrades Badge if point total is high enough)
		var pLevels = $scope.$storage.categories[index].levels;		
		$badges = $scope.$storage.child.badges[index];
		for(var i=$badges;i<pLevels.length;i++) {
			if($points[index]>=pLevels[i] && $badges<pLevels.length) {
				$scope.$storage.child.badges[index] = parseInt($scope.$storage.child.badges[index]+1);
			}
		}
		
		//Updates points and badges on Database
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
		//Clears mission from the rest of the fields and makes it available for accepting again
		$scope.cancelMission()
		//Update Badge List
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
	
	//Transitions mission from accepted to either completed or cancelled (depends on whether submission is run or not)
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

//Currently not used for Proof of concept - could be used to modify badge views or window after badges are earned
.controller('badgesCtrl', ['$scope', '$stateParams', 'StorageService',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams, StorageService) {
	$scope.$storage = StorageService.getAll();
}])
.controller('challenge_SubmittedCtrl', ['$scope', '$stateParams',
// TIP: Access Route Parameters for your page via $stateParams.parameterName
function ($scope, $stateParams) {


}])