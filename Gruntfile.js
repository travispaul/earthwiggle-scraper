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
    eslint: {
      options: {
        configFile: '.eslintrc'
      },
      target: jsFiles
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
    'eslint'
  ]);

  grunt.registerTask('test', [
    'mochaTest'
  ]);

  grunt.registerTask('checks', [
    'lint',
    'test'
  ]);
};