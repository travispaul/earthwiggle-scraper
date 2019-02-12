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
    },
    triton: {
      server: {
        options: {
          waitForHTTP: true,
          twiddle: true,
          machine: {
            name: 'earthwiggle',
            tags: {
              'triton.cns.services': 'earthwiggle',
              firewall_enabled: true
            },
            'metadata.user-script': grunt.file.read('etc/triton-user-script.sh'),
          },
          image: {
            name: 'minimal-64-lts'
          },
          package: {
            memory: 256
          }
        }
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

  grunt.registerTask('deploy', [
    'triton'
  ]);
};