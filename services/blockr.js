/*jslint node: true */
'use strict';

var _ = require('lodash');
var request = require('request');
var async = require('async');

module.exports = {
    getUnspentOutputs: function (address, useTestnet, token, callback) {
        var targetUrl = 'https://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/address/unspent/' + address + '?unconfirmed=1';

        request.get({
            url: targetUrl
        }, function (err, res, body) {
            if (err) return callback(err);
            if (res.statusCode != 200) return callback(body);
            var apiResult = JSON.parse(body);
            if (apiResult.status != 'success') {
                callback(apiResult.error);
            } else {
                var unspentOutputs = [];
                _(apiResult.data.unspent).each(function (output) {
                    unspentOutputs.push({
                        fromTxHash: output.tx,
                        outputIndex: output.n,
                        amountSatoshi: Math.round(output.amount * 100000000)
                    });
                });
                callback(null, unspentOutputs);
            }
        });
    },
    pushTransaction: function (transactionHex, useTestnet, token, callback) {
        request.post({
            url: 'https://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/tx/push',
            headers: { 'Content-Type': 'application/json' },
            json: { 'hex': transactionHex }
        }, function (err, res, body) {
            if (err) return callback(err);
            if (res.statusCode != 200) return callback(body);
            if (body.status != 'success') {
                callback(body.data);
            } else {
                callback(null, body.data);
            }
        });
    },
    confirmOpReturn: function (transactionId, expectedValue, useTestnet, token, callback) {
        var targetUrl = 'http://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/tx/info/' + transactionId;

        request.get({
            url: targetUrl
        }, function (err, res, body) {
            if (err) return callback(res.error);
            if (res.statusCode != 200) return callback(null, false); // received response, but transactionid was bad or not found, return false 
            var apiResult = JSON.parse(body);
            if (apiResult.status != 'success') {
                callback(apiResult.error);
            } else {
                var resultMessage = false;
                if (apiResult.data.vouts) {
                    _(apiResult.data.vouts).each(function (output) {
                        if (output.extras) {
                            if (output.extras.type == 'nulldata' && output.extras.asm == 'OP_RETURN ' + expectedValue) {
                                resultMessage = true;
                                return false;
                            }
                        }
                    });
                }
                callback(null, resultMessage);
            }
        });
    },
    confirmBTCBlockHeader: function (blockHeight, expectedValue, useTestnet, token, callback) {
        var targetUrl = 'http://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/block/info/' + blockHeight;

        request.get({
            url: targetUrl
        }, function (err, res, body) {
            if (err) return callback(res.error);
            if (res.statusCode != 200) return callback(null, false); // received response, but transactionid was bad or not found, return false 
            var apiResult = JSON.parse(body);
            if (apiResult.status != 'success') {
                callback(apiResult.error);
            } else { 
                var resultMessage = false;
                if (apiResult.data.merkleroot == expectedValue) {
                    resultMessage = true;
                }
                callback(null, resultMessage);
            }
        });
    },

    getBTCTransactionConfirmationCount: function (transactionId, useTestnet, token, callback) {
        var targetUrl = 'http://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/tx/info/' + transactionId;

        request.get({
            url: targetUrl
        }, function (err, res, body) {
            if (err) return callback(res.error);
            if (res.statusCode != 200) return callback(null, false); // received response, but transactionid was bad or not found, return false 
            var apiResult = JSON.parse(body);
            if (apiResult.status != 'success') {
                callback(apiResult.error);
            } else {
                callback(null, apiResult.data.confirmations);
            }
        });
    },

    getBTCBlockTxIds: function (blockHeight, useTestnet, token, callback) {
        var baseUrl = 'http://' + (useTestnet ? 'tbtc' : 'btc') + '.blockr.io/api/v1/block/raw/' + blockHeight;

        request.get({
            url: baseUrl
        }, function (err, res, body) {
            if (err) return callback(res.error);
            if (res.statusCode != 200) return callback(res.statusCode);
            var apiResult = JSON.parse(body);
            if (apiResult.status != 'success') {
                callback(apiResult.error);
            } else {
                callback(null, apiResult.data.tx);
            }
        });

    }
};