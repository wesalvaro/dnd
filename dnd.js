var dnd = angular.module('dnd', [stat.name]);

dnd.controller('sync', function($scope, profile) {
    $scope.profile = profile;
});