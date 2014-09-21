/* global Evaporate, evaporateOptions */
;(function (Evaporate, evaporateOptions) {
  'use strict';

  angular
    .module('evaporate', [])

    .factory('eva', [function () {
      return {
        _: new Evaporate(evaporateOptions),
        urlBase: 'http://' + evaporateOptions.bucket + '.s3.amazonaws.com/'
      };
    }])

    .directive('evaporate', ['$timeout', 'eva', function ($timeout, eva) {

      function link (scope, element, attrs) {

        // allocate eva's data
        if (!scope.data) scope.data = {};

        var data = scope.data,
            foo = function () {},

            // apply defaults for input parameters
            dir = data.dir ? (data.dir + '/') : '',
            headersCommon = data.headersCommon || {},
            headersSigned = data.headersSigned || {},
            onFileProgress = (typeof data.onFileProgress === 'function' ? data.onFileProgress : foo),
            onFileComplete = (typeof data.onFileComplete === 'function' ? data.onFileComplete : foo);

        // expose some info for parent scope
        data.ready = false;
        data.files = [];

        // ready..
        if (eva._.supported) {

          // ..steady..
          element.bind('change', function (event) {
            var files = event.target.files,
                i = files.length;

            function queueFile (file) {

              // process file attrs
              file.started = Date.now();
              file.path = dir + file.started;
              file.url = eva.urlBase + file.path;

              // queue file for upload
              eva._.add({

                // filename, relative to bucket
                name: file.path,

                // content
                file: file,

                // headers
                contentType: file.type || 'binary/octet-stream',
                notSignedHeadersAtInitiate: headersCommon,
                xAmzHeadersAtInitiate:      headersSigned,

                // event callbacks
                complete: function () {

                  // check file as completed
                  file.completed = true;

                  // execute user's callback
                  onFileComplete(file);

                  // update ui
                  scope.$apply();
                },
                progress: function (progress) {

                  // update progress
                  file.progress = Math.round(progress * 10000) / 100;
                  file.timeLeft = Math.round(
                    (100 - file.progress) / file.progress *
                    (Date.now() - file.started) / 1000
                  );

                  // execute user's callback
                  onFileProgress(file);

                  // update ui
                  scope.$apply();
                }
              });

              // expose file data to model
              data.files.push(file);
            }

            function iterate () {
              if (--i >= 0) {
                queueFile(files[i]);
                $timeout(iterate, 10);
              }
            }

            // start queueing
            iterate();
          });

          // ..go!
          data.ready = true;
        }
      }

      return {
        restrict: 'A',
        link: link,
        scope: {
          data: '=evaModel'
        }
      };
    }]);

})(Evaporate, evaporateOptions);
