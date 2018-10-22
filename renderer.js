var XLSX = require('xlsx');
var electron = require('electron').remote;

var firstSheet		// first sheet's name
var name = '姓名'
var update = '出勤时间'
var uptime = '时间'
var upday = '出勤日'
var timeZero = '0.00'
var timeTwo = '2.00'
var timeSix = '6.00'
var timeEight = '8.00'
var timeNine = '9.10'
var timeFourteen = '14.00'
var timeSeventeenAndHarf = '17.30'
var timeTwentyOne = '21.00'
var commentA = '说明1'
var commentB = '说明2'
var commentC = '说明3'
var commentD = '说明4'
var thisYear
var thisMonth
var allDaysNum			// 处理多少天的数据 需求变更（变为当月总天数）
var nonworkdays		// 这些天数之内的所有非工作日

function improveDate(oldData) {
    oldData.forEach((item, index) => {
        const date = new Date(1900, 0, item[update] - 1).toLocaleString().split(' ')[0];
        const dateArr = date.split('/');
        let dateBox = `${dateArr[1]}/${dateArr[2]}/${dateArr[0].substr(2)}`;
        oldData[index][update] = dateBox;
        const time = new Date(1900, 0, item[uptime] - 1).toLocaleString();
        const isAfternoon = time.substr(11, 2) === '下午';
        const timeArr = time.substr(13).split(':');
        let timeBox = '';
        timeArr.forEach((item, index) => {
            if (index === 0) {
                if (isAfternoon) {
                    timeBox += `${Number(item) + 12}:`;
                } else {
                    timeBox += `${item}:`;
                }
            } else if (index === 1) {
                timeBox += item;
            }
        });
        oldData[index][uptime] = timeBox;
    });
    dealData(oldData);
}

function dealData(originalJson) {
    // 拿到的Excel第一张表的数据
    var firstSheetData = originalJson;

    // -----一-----

    // 合并过同一人同一天打卡记录的数据
    var dataMerged = []
    // 合并同一人同一天的记录
    firstSheetData.forEach(function (ele, index) {
        if (index == 0) {
            var kobe = {}
            kobe[name] = ele[name]
            kobe[update] = ele[update]
            kobe[uptime] = [ele[uptime].replace(':', '.')]
            dataMerged[0] = kobe
        } else {
            if (ele[name] == firstSheetData[index - 1][name] && ele[update] == firstSheetData[index - 1][update]) {
                dataMerged.forEach(function (element, idx) {
                    if (element[name] == ele[name] && element[update] == ele[update]) {
                        dataMerged[idx][uptime].push(ele[uptime].replace(':', '.'))
                    }
                })
            } else {
                var jordan = {}
                jordan[name] = ele[name]
                jordan[update] = ele[update]
                jordan[uptime] = [ele[uptime].replace(':', '.')]
                dataMerged.push(jordan)
            }
        }
    })

    // 处理出勤时间格式
    var tmp = []
    dataMerged.forEach(function (item, index) {
        var box = {}
        box[name] = item[name]
        box[uptime] = item[uptime]
        var idx = item[update].lastIndexOf('/')
        box[update] = '2018/' + item[update].substring(0, idx)
        tmp[index] = box
    })
    dataMerged = tmp

    // -----二-----

    // 表中所有人的姓名
    var nameList = []
    // 计数器
    var count = 0
    nameList[0] = (dataMerged[0])[name]
    // 匹配出勤日的正则
    // var reg = /\/(.*)\//
    var reg = /\/.*\/(.*)/
    dataMerged.forEach(function (ele) {
        // 拼装nameList
        if (ele[name] != nameList[count]) {
            nameList.push(ele[name])
            count++
        }

        // -----三-----

        // 从出勤时间中取出出勤日
        ele[upday] = (ele[update].match(reg))[1]
    })


    // 获取thisYear thisMonth allDaysNum nonworkdays
    var thisDate = (dataMerged[0])[update]
    // var regForYear = /\/.*\/(.*)$/
    var regForYear = /^(.*)\/.*\//
    // var regForMonth = /^(.*)\/.*\//
    var regForMonth = /^.*\/(.*)\/.*$/
    thisYear = thisDate.match(regForYear)[1]
    thisMonth = thisDate.match(regForMonth)[1]
    // var tempMax = 0
    // dataMerged.forEach(function (it) {
    // 	if (Number(it[upday]) > tempMax) {
    // 		tempMax = Number(it[upday])
    // 	}
    // })
    // allDaysNum = tempMax
    if (thisMonth == '2') {
        if (thisYear % 4 == 0) {			// 闰年二月
            allDaysNum = 29
        } else {			// 平年二月
            allDaysNum = 28
        }
    } else {
        allDaysNum = 30
        var bigMonth = [1, 3, 5, 7, 8, 10, 12]
        bigMonth.forEach(function (elem) {
            if (elem == thisMonth) {
                allDaysNum = 31
            }
        })
    }
    // MARK
    var tempNonworkdays = '1 2';
    if (tempNonworkdays) {
        nonworkdays = tempNonworkdays.split(' ')
    } else {
        alert('请刷新页面并填入非工作日之后再选择文件~')
    }

    // -----四-----

    // 补全所有日期的完整数据
    var wholeData = []
    nameList.forEach(function (ele) {
        for (var i = 1; i <= allDaysNum; i++) {
            var existFlag = false
            var existIndex
            for (var j = 0; j < dataMerged.length; j++) {			// 判断存不存在当前姓名和日期的数据 每个人每一天的数据均须判断
                if ((dataMerged[j])[name] == ele && (dataMerged[j])[upday] == i) {
                    existFlag = true
                    existIndex = j
                    break
                }
            }
            if (existFlag) {		// 存在当前姓名和当前日期的数据 直接拿出来
                wholeData.push(dataMerged[existIndex])
            } else {			// 不存在当前姓名和日期的打卡记录 则手动拼装
                var wholeDataItem = {}
                wholeDataItem[name] = ele
                // wholeDataItem[update] = thisMonth + '/' + i + '/' + thisYear
                wholeDataItem[update] = thisYear + '/' + thisMonth + '/' + i
                wholeDataItem[upday] = i
                wholeDataItem[uptime] = ''			// 无打卡的工作日 时间记为空字符串
                wholeData.push(wholeDataItem)
            }
        }
    })

    wholeData.forEach(function (ele, idx) {
        ele[commentA] = ''
        ele[commentB] = ''
        ele[commentC] = ''
        ele[commentD] = ''

        // -----五-----

        // 增加说明1：工作日无打卡 非工作日打卡 正常
        var _isNoworkday = false			// 是否为非工作日
        nonworkdays.forEach(function (element) {
            if (ele[upday] == element) {
                _isNoworkday = true
            }
        })
        if (_isNoworkday && ele[uptime] != '') {

            // -----八-----

            // 增加说明4：非工作日打卡记录的处理———— 15 30 请核对（只有一次打卡 或者 时长之差小于4）
            if (ele[uptime].length == 1) {			// 周末一次打卡
                ele[commentA] += '周末打卡一次，请核对 '
            } else {			// 周末多次打卡
                var duration = (ele[uptime])[(ele[uptime]).length - 1] - (ele[uptime])[0]			// 第一次打卡与最后一次打卡之间的时长
                if (duration >= 8) {
                    ele[commentA] += '30（周末加班） '
                } else if (duration >= 4) {
                    ele[commentA] += '15（周末加班4-8小时） '
                } else {
                    ele[commentA] += '周末加班小于4小时 '
                }
            }
        } else if (!_isNoworkday && ele[uptime] == '') {
            ele[commentA] += '缺勤 '
        } else {
            ele[commentA] += ''
        }

        if (!_isNoworkday) {			// 工作日

            // -----六-----

            // 增加说明2：缺少上午打卡 缺少下午打卡 不处理非工作日打卡 只处理多次打卡的数据 一次打卡已在commentC记为“请核对”
            if (ele[uptime].length > 1) {			// 有多次打卡记录
                if (Number((ele[uptime])[0]) > Number(timeFourteen)) {			// 第一次打卡晚于14.00 则缺少上午打卡
                    ele[commentB] += '缺少上午打卡 '
                } else if (Number((ele[uptime])[(ele[uptime]).length - 1]) <= Number(timeFourteen)) {			// 最后一次打卡早于14.00
                    if (ele[upday] == allDaysNum) {			// 当天是表中所有数据的最后一天 则记为导入的表中无次日数据
                        ele[commentB] += '导入的表中无次日数据 '
                    } else {	// 不是最后一天
                        if ((wholeData[idx + 1])[uptime] == '') {			// 次日无打卡
                            ele[commentB] += '缺少下午打卡 '
                        } else {			// 次日有打卡
                            if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeSix)) {			// 次日6点或6点以前有打卡 则有加班 记为正常
                                ele[commentB] += ''
                            } else if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeEight)) {			// 次日6-8点有打卡 则可能有加班 记为次日**点有打卡记录，清核对
                                // ele[commentB] = '次日' + ((wholeData[idx + 1])[uptime])[0] + '有打卡记录，可能加班，请核对'
                                ele[commentB] += ''
                            } else {			// 次日8点前均无打卡 则记为缺少下午打卡
                                ele[commentB] += '缺少下午打卡 '
                            }
                        }
                    }
                } else {
                    ele[commentB] += ''
                }
            } else {
                ele[commentB] += ''
            }

            // -----七-----

            // 增加说明3：迟到 早退 请核对（当天只有一次打卡记录）
            if (ele[uptime].length == 1) {			// 一次打卡记录 周内
                if (Number((ele[uptime])[0]) <= Number(timeSix)) {			// 该次打卡在6点之前 则为前一日加班 跳过
                    ele[commentC] += ''
                } else {			// 6点之后
                    ele[commentC] += '只有一次' + (ele[uptime])[0] + '的打卡记录，请核对 '
                }
            } else if (ele[uptime].length > 1) {			// 多次
                if (Number((ele[uptime])[0]) > Number(timeNine)) {			// 第一次打卡晚于9.10
                    ele[commentC] += '迟到 '
                } else if (Number((ele[uptime])[(ele[uptime]).length - 1]) < Number(timeSeventeenAndHarf)) {			// 最后一次打卡早于17.30
                    if (ele[upday] == allDaysNum) {			// 当天是表中所有数据的最后一天 则记为导入的表中无次日数据
                        ele[commentC] += '导入的表中无次日数据 '
                    } else {	// 不是最后一天
                        if ((wholeData[idx + 1])[uptime] == '') {			// 次日无打卡
                            ele[commentC] += '早退'
                        } else {			// 次日有打卡
                            if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeSix)) {			// 次日6点或6点以前有打卡 则有加班 记为正常
                                ele[commentC] += ''
                            } else if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeEight)) {			// 次日6-8点有打卡 则可能有加班 记为次日**点有打卡记录，清核对
                                // ele[commentC] = '次日' + ((wholeData[idx + 1])[uptime])[0] + '有打卡记录，可能加班，请核对'
                                ele[commentC] += ''
                            } else {			// 次日8点前均无打卡
                                ele[commentC] += '早退'
                            }
                        }
                    }
                } else {
                    ele[commentC] += ''
                }
            } else {			// 无打卡记录 已在commentA记为缺勤
                ele[commentC] += ''
            }

            // -----九-----

            // 增加说明5: 15（工作日21点后打卡为加班 工作日次日6点前打卡为加班 工作日次日6-8点有打卡 请核对）
            if (ele[uptime].length > 1) {			// 多次打卡记录
                if (Number((ele[uptime])[ele[uptime].length - 1]) >= Number(timeTwentyOne)) {			// 工作日最后一次打卡记录大于等于21点
                    ele[commentD] += '15（晚上加班） '
                } else {
                    ele[commentD] += ''
                }
                if (ele[upday] == allDaysNum) {			// 当天是表中所有数据的最后一天
                    ele[commentD] += ''
                } else {			// 不是最后一天
                    if ((wholeData[idx + 1])[uptime] == '') {			// 次日无打卡
                        ele[commentD] += ''
                    } else {			// 次日有打卡
                        if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeSix)) {			// 工作日次日有6点之前的打卡记录
                            ele[commentD] += '15（加班至凌晨） '
                        } else if (Number(((wholeData[idx + 1])[uptime])[0]) <= Number(timeEight)) {			// 工作日次日有6-8点的打卡记录
                            ele[commentD] += '次日' + ((wholeData[idx + 1])[uptime])[0] + '有打卡记录，可能加班，请核对 '
                        } else {
                            ele[commentD] += ''
                        }
                    }
                }
            } else {
                ele[commentD] += ''
            }
        } else {			// 非工作日
            ele[commentB] += ''
            ele[commentC] += ''
            ele[commentD] += ''
        }
    })

    // -----十-----

    // 组装最终的结果数据
    var resultData = [['姓名', '日期', '当日所有打卡记录', '说明1', '说明2', '说明3', '说明4']]
    wholeData.forEach(function (ele) {
        var _isNoworkday = false			// 是否为非工作日
        nonworkdays.forEach(function (element) {
            if (ele[upday] == element) {
                _isNoworkday = true
            }
        })
        // 非工作日无打卡 则顺便过滤 否则push进最终数据
        if (!(_isNoworkday && ele[uptime] == '')) {
            var resultItem = []
            // 姓名
            resultItem.push(ele[name])
            // 日期
            // 处理日期格式 10/1/17 => 2017/10/1
            // var monthAndDay = ele[update].match(/^(.*\/.*)\//)[1]
            // var updataDealt = '20' + thisYear + '/' + monthAndDay
            var updataDealt = ele[update]
            resultItem.push(updataDealt)
            // 打卡时间
            var _uptime = ''
            if (ele[uptime] != '') {
                ele[uptime].forEach(function (item, itemIndex) {
                    if (itemIndex == 0) {
                        _uptime += item.replace('.', ':')
                    } else {
                        _uptime += ', ' + item.replace('.', ':')
                    }
                })
            }
            resultItem.push(_uptime)
            // 说明1
            resultItem.push(ele[commentA])
            // 说明2
            resultItem.push(ele[commentB])
            // 说明3
            resultItem.push(ele[commentC])
            // 说明4
            resultItem.push(ele[commentD])
            resultData.push(resultItem)
        }
    })
    // var data = [['姓名', '日期', '差异', '原因'], ['周欢', '2017/8/2', 15, 15, 15], ['周欢', '2017/8/2', 15, 15], ['周欢', '2017/8/2', 15, 15], ['周欢', '2017/8/2', 15, 15], ['周欢', '2017/8/2', 15, 15]]

    // 调用factory 传入resultData
    factory(resultData)
}

var process_wb = (function() {
	return function process_wb(wb) {
		wb.SheetNames.forEach(function(sheetName) {
            var jsonStr = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
            improveDate(jsonStr);
		});
	};
})();

var do_file = (function() {
	return function do_file(files) {
		var f = files[0];
		var reader = new FileReader();
		reader.onload = function(e) {
            var data = e.target.result;
			process_wb(XLSX.read(data, {type: 'array'}));
		};
		reader.readAsArrayBuffer(f);
	};
})();

(function() {
	var drop = document.getElementById('drop');

	function handleDrop(e) {
		e.stopPropagation();
        e.preventDefault();
		do_file(e.dataTransfer.files);
	}

	function handleDragover(e) {
		e.stopPropagation();
		e.preventDefault();
		e.dataTransfer.dropEffect = 'copy';
	}

	drop.addEventListener('dragenter', handleDragover, false);
	drop.addEventListener('dragover', handleDragover, false);
	drop.addEventListener('drop', handleDrop, false);
})();

function factory(resultData) {
    function sheet_from_array_of_arrays(data, opts) {
        var ws = {};
        var range = { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };
        for (var R = 0; R != data.length; ++R) {
            for (var C = 0; C != data[R].length; ++C) {
                if (range.s.r > R) range.s.r = R;
                if (range.s.c > C) range.s.c = C;
                if (range.e.r < R) range.e.r = R;
                if (range.e.c < C) range.e.c = C;
                var cell = { v: data[R][C] };
                if (cell.v == null) continue;
                var cell_ref = XLSX.utils.encode_cell({ c: C, r: R });

                if (typeof cell.v === 'number') cell.t = 'n';
                else if (typeof cell.v === 'boolean') cell.t = 'b';
                else if (cell.v instanceof Date) {
                    cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                    cell.v = 'kobe';
                }
                else cell.t = 's';

                ws[cell_ref] = cell;
            }
        }
        if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
        return ws;
    }

    /* result data */
    var data = resultData;
    var ws_name = "eleven";

    function Workbook() {
        if (!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }

    var wb = new Workbook(), ws = sheet_from_array_of_arrays(data);

    /* add worksheet to workbook */
    wb.SheetNames.push(ws_name);
    wb.Sheets[ws_name] = ws;
    var XTENSION = "xls|xlsx|xlsm|xlsb|xml|csv|txt|dif|sylk|slk|prn|ods|fods|htm|html".split("|")
    var o = electron.dialog.showSaveDialog({
        title: '将文件存储为',
        filters: [{
            name: "Spreadsheets",
            extensions: XTENSION
        }]
    });
    o = o.split('.')[0] + '.xlsx';
    XLSX.writeFile(wb, o);
    electron.dialog.showMessageBox({ message: "huan已为您将表格导出为" + o, buttons: ['嗯嗯'] });
}
