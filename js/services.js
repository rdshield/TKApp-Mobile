angular.module('app.services', ['ngStorage'])

.factory ('StorageService', function ($localStorage) {

$localStorage = $localStorage.$default({
	child: {},
	children: {},
	mission: {},
	missionType: {},
	categories: [],
	challenges: [],
	availableChallenges: [],
	currentChallenges: 	 [],
	completedChallenges: [],
});
	
var	_getAll = function () 	   {  return $localStorage; }
var _add 	= function (key,thing) { $localStorage[key] = thing }
var _remove = function (thing) { $localStorage.things.splice($localStorage.things.indexOf(thing), 1) }
var _reset = function () {
	$localStorage.child= 				{},
	$localStorage.children= 			{},
	$localStorage.mission=				{},
	$localStorage.missionType=			{},
	$localStorage.challenges= 			[],
	$localStorage.availableChallenges=	[],
	$localStorage.currentChallenges= 	[],
	$localStorage.completedChallenges= 	[];
	$localStorage.categories= 			[];
}

return {
    getAll: _getAll,
    add: _add,
    remove: _remove,
	resetToDefault: _reset,
  };
})