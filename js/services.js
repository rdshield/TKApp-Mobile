angular.module('app.services', ['ngStorage'])

.factory ('StorageService', function ($localStorage) {

$localStorage = $localStorage.$default({
	saveLogin: false,
	child: {},
	children: {},
	mission: {},
	missionType: {},
	categories: [],
	missions: [],
	availableMissions: [],
	currentMissions:   [],
	completedMissions: [],
	badges: [],
	timesRun: 0,
});
	
var	_getAll = function () 	   { return $localStorage; }
var _add 	= function (key,thing) { $localStorage[key] = thing;}
var _remove = function (thing) { $localStorage.things.splice($localStorage.things.indexOf(thing), 1) }
var _reset = function () {
	$localStorage.saveLogin= 			false;
	$localStorage.mission=				{},
	$localStorage.missionType=			{},
	$localStorage.missions= 			[],
	$localStorage.availableMissions=	[],
	$localStorage.currentMissions= 		[],
	$localStorage.completedMissions= 	[],
	$localStorage.categories= 			[],
	$localStorage.badges=				[],
	$localStorage.timesRun=				0;
}

return {
    getAll: _getAll,
    add: _add,
    remove: _remove,
	resetToDefault: _reset,
  };
})