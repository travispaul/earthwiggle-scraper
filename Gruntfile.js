module.exports = function (grunt) {
  require('grunt-task-loader')(grunt);

  const jsFiles = [
    'Gruntfile.js',
    'lib/**/*.js',
    'test/**/*.js',
    'bin/*'];

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      files: {
        src: jsFiles
      }
    },
    jscs: {
      options: {
        config: '.jscsrc'
      },
      src: jsFiles
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          timeout: 5000
        },
        src: ['test/**/*.js']
      }
    }
  });

  grunt.registerTask('lint', [
    'jshint',
    'jscs'
  ]);

  grunt.registerTask('test', [
    'mochaTest'
  ]);

  grunt.registerTask('checks', [
    'lint',
    'test'
  ]);

};