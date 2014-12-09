var stat = angular.module('stat', []);

stat.constant('stats', {
  str: 0,
  int: 0,
  wis: 0,
  cha: 0,
  dex: 0,
  con: 0,
  ac: 0,
  lvl: 1,
  bonus: 2
});

stat.constant('skills', [
  {name: 'Acrobatics', stat: 'dex', proficient: false, doubleProficient: false},
  {name: 'Animal Handling', stat: 'wis', proficient: false, doubleProficient: false},
  {name: 'Arcana', stat: 'int', proficient: false, doubleProficient: false},
  {name: 'Athletics', stat: 'str', proficient: false, doubleProficient: false},
  {name: 'Deception', stat: 'cha', proficient: false, doubleProficient: false},
  {name: 'History', stat: 'int', proficient: false, doubleProficient: false},
  {name: 'Insight', stat: 'wis', proficient: false, doubleProficient: false},
  {name: 'Intimidation', stat: 'cha', proficient: false, doubleProficient: false},
  {name: 'Investigation', stat: 'int', proficient: false, doubleProficient: false},
  {name: 'Medicine', stat: 'wis', proficient: false, doubleProficient: false},
  {name: 'Nature', stat: 'int', proficient: false, doubleProficient: false},
  {name: 'Perception', stat: 'wis', proficient: false, doubleProficient: false},
  {name: 'Performance', stat: 'cha', proficient: false, doubleProficient: false},
  {name: 'Persuasion', stat: 'cha', proficient: false, doubleProficient: false},
  {name: 'Religion', stat: 'int', proficient: false, doubleProficient: false},
  {name: 'Sleight of Hand', stat: 'dex', proficient: false, doubleProficient: false},
  {name: 'Stealth', stat: 'dex', proficient: false, doubleProficient: false},
  {name: 'Survival', stat: 'wis', proficient: false, doubleProficient: false}
]);

stat.constant('savingThrows', {
  str: false,
  int: false,
  wis: false,
  cha: false,
  dex: false,
  con: false,
});

stat.directive('inplace', function() {
  return {
    restrict: 'A',
    replace: true,
    templateUrl: 'stat-editable.ng',
    scope: {
      value: '=',
      type: '@'
    },
    link: function(s) {
      angular.extend(s, {
        locked: true,
        lock: function() {
          s.locked = true;
        },
        unlock: function() {
          s.locked = false;
        }
      });
    }
  };
});

stat.constant('roll', function() {
  return Math.floor(Math.random() * 100) % 20 + 1;
});

stat.factory('modCalc', function(stats) {
  return function(stat, opt_prof, opt_dblProf) {
    return Math.floor((parseInt(stats[stat], 10) - 10) / 2) +
        (opt_prof ? stats.bonus : 0) +
        (opt_dblProf ? stats.bonus : 0);
  };
});

stat.directive('stat', function(stats, modCalc, $rootScope) {
  return {
    restrict: 'A',
    replace: true,
    templateUrl: 'stat-aspect.ng',
    scope: {
      name: '@',
      ac: '@'
    },
    link: function(s) {
      var update = false;
      s.stats = stats;
      if (s.name == 'ac') {
        s.mod = function() {
          return stats[s.name] + modCalc('dex');
        };
      } else {
        s.mod = modCalc.bind(this, s.name);
      }
      s.$watch('value', function(value) {
        if (update) return;
        stats[s.name] = value;
        $rootScope.$broadcast('STAT_CHANGE', s.name);
        console.log('changed');
        update = false;
      });
      s.$on('STAT_CHANGE', function(evt, statName) {
        console.log('STAT_CHANGE', statName, s.name);
        if (statName == s.name) {
          s.value = stats[s.name];
          update = true;
        }
      });
    }
  }
});

stat.directive('skillz', function(skills, modCalc) {
  return {
    restrict: 'A',
    templateUrl: 'stat-skills.ng',
    scope: {},
    link: function(s) {
      s.skills = skills;
      s.mod = function(skill) {
        return modCalc(skill.stat, skill.proficient, skill.doubleProficient);
      }
    }
  };
});

stat.directive('roll', function(roll, modCalc) {
  return {
    restrict: 'A',
    templateUrl: 'roll.ng',
    scope: {
      what: '@',
      proficient: '=',
      doubleProficient: '='
    },
    link: function(s) {
      s.roll = function() {
        var natural = roll();
        s.critSuccess = natural == 20;
        s.critFailure = natural == 1;
        s.value = natural + modCalc(s.what, s.proficient, s.doubleProficient);
      }
      s.value = 'Roll';
    }
  }
})

stat.factory('profile', function(stats, skills, savingThrows, $rootScope) {
  var user;
  var ref = new Firebase("https://dnd5e.firebaseio.com");
  var service = {
    login: function(email, pass) {
      ref.authWithPassword({
        email: email,
        password: pass
      }, function(err, authData) {
        console.log(err, authData);
      });
    },
    logout: function() {
      ref.unauth();
    },
    save: function() {
      var skillsToSave = {};
      angular.forEach(skills, function(skill) {
        skillsToSave[skill.name] = {
          proficient: skill.proficient,
          doubleProficient: skill.doubleProficient
        };
      });
      ref.child('users').child(user.uid).set({
        stats: stats,
        skills: skillsToSave,
        savingThrows: savingThrows
      });
    }
  };
  ref.onAuth(function(authData) {
    console.log(authData);
    user = authData;
    ref.child('users').child(user.uid).on('value', function(snapshot) {
      var data = snapshot.val();
      angular.copy(data.stats, stats);
      angular.copy(data.savingThrows, savingThrows);
      angular.forEach(skills, function(skill) {
        skill.proficient = data.skills[skill.name].proficient;
        skill.doubleProficient = data.skills[skill.name].doubleProficient;
      });
      service.email = authData.password.email;
      service.password = 'password';
      $rootScope.$apply();
    });
  });
  
  return service;
});