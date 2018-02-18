var logger = require('./logger');
var readFile = require('./singleFileProcessor').readFile;
var writeFile = require('./singleFileProcessor').writeFile;
var rollupModuleData = function (projectPath) {
    console.log('rollupModuleData: ', projectPath);
    var map = {};
    var data = JSON.parse(readFile('./modules.json'));
    for (var m in data) {
        if (data.hasOwnProperty(m)) {
            var sourceModule = data[m].requires;
            //console.log(m, sourceModule);
            for (var dm in sourceModule) {
                if (sourceModule.hasOwnProperty(dm)) {
                    var dependency = sourceModule[dm];
                    var hash = map[dm];
                    if (hash) {
                        var count = hash + 1;
                        map[dm] = count;
                    } else {
                        map[dm] = 1;
                    }
                    //console.log(dm, map[dm]);
                }
            }
        }
    }
    var output = [];
    for (var m in map) {
        if (map.hasOwnProperty(m)) {
            //console.log(m);
            var kind = '?';
            if (m.indexOf('-path/') !== -1) {
                kind = 'LOCAL';
            } else if (m.indexOf('/') === -1 || m.indexOf('plugins/') !== -1 || m.indexOf('uiBasePath') !== -1) {
                kind = 'COMMON';
            } else if (m.indexOf('galileo-lib') !== -1) {
                kind = 'ENGINE';
            }
            //          else if (m.indexOf('css!') !== -1) {
            //                kind = 'LOCAL-CSS';
            //            } else if (m.indexOf('text!') !== -1) {
            //                kind = 'LOCAL-TEMPLATE';
            //            } else if (m.indexOf('i18n!') !== -1) {
            //                kind = 'LOCAL-I18N';
            //            }
            output.push({
                name: m,
                count: map[m],
                kind: kind
            });
        }
    }
    output = output.sort(function compare(a, b) {
        if (a.kind < b.kind) {
            return 1;
        } else if (a.kind > b.kind) {
            return -1;
        } else {
            if (a.count < b.count) {
                return 1;
            } else if (a.count > b.count) {
                return -1;
            }
        }
        return 0;
    });
    console.log('rollupModuleData: ', rollupModuleData);
    writeFile(projectPath + '/module-stats.json', JSON.stringify(output, null, 2));
    var buffer = [];
    buffer.push("NAME" + ',' + "REFERENCES" + ',' + "LOCATION");
    for (var index = 0; index < output.length; index++) {
        var record = output[index]
        buffer.push(record.name + ',' + record.count + ',' + record.kind);
    }
    writeFile(projectPath + '/module-stats' + '.csv', buffer.join('\n'));
};
module.exports = {
    'rollupModuleData': rollupModuleData
};