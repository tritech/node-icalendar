module.exports = function (grunt) {
  // See http://www.jshint.com/docs/#strict
  "use strict";

  // Project configuration.
  grunt.initConfig({
    jasmine_node: {
      projectRoot: "."
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-jasmine-node');

  // Default task.
  grunt.registerTask('default', ['jasmine_node']);

  // Travis-CI task
  grunt.registerTask('travis', ['default']);

};
