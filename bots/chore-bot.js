var Botkit = require('botkit');
var os = require('os');

var controller = Botkit.slackbot({
    debug: false
    //include "log: false" to disable logging
    //or a "logLevel" integer from 0 to 7 to adjust logging verbosity
});

// connect the bot to a stream of messages
controller.spawn({
    token: 'xoxb-111874169959-qcQ6mM1wwkomxtKXxYfwUECC'
}).startRTM();

// give the bot something to listen for
controller.hears('hello',
                 ['direct_message','direct_mention','mention'],
                 function(bot,message) {
                     bot.reply(message,'Time to do your chores SON!');
                 }
                );

controller.hears(['chore me (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
    var chore = message.match[1];
    controller.storage.users.get(message.user, function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.chore = chore;
        controller.storage.users.save(user, function(err, id) {
            bot.reply(message, 'You have the chore: ' + user.chore + ' from now on.');
        });
    });
});


controller.hears(['what is my chore', 'my chore'], 'direct_message,direct_mention,mention', function(bot, message) {

    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.chore) {
            bot.reply(message, 'Your chore is ' + user.chore);
        } else {
            bot.startConversation(message, function(err, convo) {
                if (!err) {
                    convo.say('I do not know your chore yet!');
                    convo.ask('What chore should I give you?', function(response, convo) {
                        convo.ask('You want me to give you `' + response.text + '`?', [
                            {
                                pattern: 'yes',
                                callback: function(response, convo) {
                                    // since no further messages are queued after this,
                                    // the conversation will end naturally with status == 'completed'
                                    convo.next();
                                }
                            },
                            {
                                pattern: 'no',
                                callback: function(response, convo) {
                                    // stop the conversation. this will cause it to end with status == 'stopped'
                                    convo.stop();
                                }
                            },
                            {
                                default: true,
                                callback: function(response, convo) {
                                    convo.repeat();
                                    convo.next();
                                }
                            }
                        ]);

                        convo.next();

                    }, {'key': 'chore'}); // store the results in a field called nickname

                    convo.on('end', function(convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will update my dossier...');

                            controller.storage.users.get(message.user, function(err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.chore= convo.extractResponse('chore');
                                controller.storage.users.save(user, function(err, id) {
                                    bot.reply(message, 'Got it. I will give you chore ' + user.chore);
                                });
                            });



                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');
                        }
                    });
                }
            });
        }
    });
});

controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'],
                 'direct_message,direct_mention,mention',
                 function(bot, message) {
                     var hostname = os.hostname();
                     var uptime = formatUptime(process.uptime());
                     bot.reply(message,
                               ':robot_face: I am a bot named <@' + bot.identity.name +
                               '>. I have been running for ' + uptime + ' on ' + hostname + '.');
});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}
