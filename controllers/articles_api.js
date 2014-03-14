// articles.js

var
    async = require('async'),
    api = require('../api'),
    db = require('../db'),
    utils = require('./_utils'),
    constants = require('../constants');

var
    User = db.user,
    Article = db.article,
    Category = db.category,
    Text = db.text,
    sequelize = db.sequelize,
    next_id = db.next_id;

exports = module.exports = {

    'GET /api/articles/:id': function(req, res, next) {
        utils.find(Article, req.params.id, function(err, entity) {
            return err ? next(err) : res.send(entity);
        });
    },

    'POST /api/articles': function(req, res, next) {
        /**
         * Create a new article.
         * 
         * @return {object} The created article object.
         */
        if ( ! req.user || req.user.role > constants.ROLE_EDITOR) {
            return res.send(api.not_allowed('Permission denied.'));
        }
        var name = utils.get_required_param('name', req);
        if ( ! name) {
            return next(api.invalid_param('name'));
        }
        var category_id = utils.get_required_param('category_id', req);
        if ( ! category_id) {
            return next(api.invalid_param('category_id'));
        }
        var content = utils.get_required_param('content', req);
        if ( ! content) {
            return next(api.invalid_param('content'));
        }
        var description = utils.get_param('description', '', req);
        var tags = utils.format_tags(utils.get_param('tags', '', req));

        var publish_time = Date.now(); //req.body.publish_time;

        var cover_id = 'xxx';
        var content_id = next_id();
        var article_id = next_id();

        sequelize.transaction(function(tx) {
            async.series({
                category: function(callback) {
                    utils.find(Category, category_id, callback);
                },
                text: function(callback) {
                    utils.save(Text, {
                        id: content_id,
                        ref_id: article_id,
                        value: content
                    }, tx, callback);
                },
                article: function(callback) {
                    utils.save(Article, {
                        id: article_id,
                        user_id: req.user.id,
                        user_name: req.user.name,
                        category_id: category_id,
                        cover_id: cover_id,
                        content_id: content_id,
                        name: name,
                        tags: tags,
                        description: description,
                        publish_time: publish_time
                    }, tx, callback);
                }
            }, function(err, results) {
                if (err) {
                    return tx.rollback().success(function() {
                        return next(err);
                    });
                }
                tx.commit().error(function(err) {
                    return next(err);
                }).success(function() {
                    return res.send(results.article);
                });
            });
        });
    }
}