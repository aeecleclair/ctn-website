let mongoose = require('mongoose');
let mongoosePaginate = require('mongoose-paginate');

let videoSchema = new mongoose.Schema({
  title: {type: String, default: ''},
  uploadDate: {type: Date, default: Date.now},
  uploader: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  description: {type: String, default: ''},
  views: {type: Number, default: 0},
  validated: {type: Boolean, default: false},
  tags: [String]
});

videoSchema.plugin(mongoosePaginate);

let Video = mongoose.model('Video', videoSchema);
exports.model = Video;

exports.return = (id, query, callback) => {
  if (id === null) {
    let options = {
  		sort: {uploadDate: -1},
      populate: 'uploader',
  		page: query.page,
  		limit: query.per_page
  	}

    Video.paginate({validated: true}, options, (err, result) => {
      if (err) return callback(null, new Error('Erreur lors de la récupération de la liste des vidéos.'));
      //result donne des infos diverses sur ce qu'a fait le plugin mongoose-paginate : les docs satisfaisant la requête et les options sont dans le field 'docs'
      if (result.docs === null || typeof result.docs === 'undefined') return callback(null);
      let filteredResults = result.docs.map(obj => {
        let filteredObj = obj.toJSON();
        if (obj.uploader)
          filteredObj.uploader = obj.uploader.surname || obj.uploader.fullName;
        return filteredObj;
      });
      callback(filteredResults);
    });
  }
  else {
    // On incrémente le nombre de vues à chaque fetch quasi-unique
    // On renvoie la vidéo après update, donc avec la nouvelle vue prise en compte
    Video.findByIdAndUpdate(id, {$inc: {views: 1}}, {'new':true}).populate('uploader').exec((err, result) => {
      if (err) callback({}, new Error(`Erreur lors de la récupération de la vidéo. ID =${id}`));
      if (result === null || typeof result === 'undefined') return callback(null);

      let filteredResult = result.toJSON();

      if (typeof filteredResult.uploader !== 'undefined')
        filteredResult.uploader = result.uploader.surname || result.uploader.fullName;
      callback(filteredResult);
    });
  }
}

exports.returnList = exports.return.bind(this, null);

exports.returnVideoCount = (callback) => {
  Video.count({}, (err, count) => {
    if (err) return callback();
    callback(count);
  });
}

exports.getRelatedVideos = (id, callback) => {
  Video.findOne({_id: id}, '_id title', (err, result) => {
    if (err) callback(null, new Error(`Erreur lors de la récupération de la vidéo. ID = ${id}`));
    if (result === null || typeof result === 'undefined') return callback(null);

    title = result.title;
    Video.find({_id: {$ne: id}, validated: true}, (err, allVideos) => {
      if (err) return callback(null, new Error(`Erreur lors de la récupération de la liste des vidéos liées. ID = ${id}`));
      if (allVideos === null || typeof allVideos === 'undefined' || allVideos.length === 0) return callback(null);

      relatedVideos = require('fuzzy').filter(title.split(' ')[0], allVideos, {extract: video => video.title}).map(e => e.original);
      callback(relatedVideos);
    });
  });
}

exports.searchRelatedVideos = (title, callback) => {
  Video.find({validated: true}).populate('uploader').exec((err, allVideos) => {
    if (err) return callback(null, new Error(`Erreur lors de la récupération de la liste des vidéos pour la recherche. ID = ${id}`));
    if (allVideos === null || typeof allVideos === 'undefined') return callback(null);

    let filteredResults = allVideos.map(obj => {
      let filteredObj = obj.toJSON();
      if (obj.uploader) filteredObj.uploader = obj.uploader.surname;
      return filteredObj;
    });

    relatedVideos = require('fuzzy').filter(title, filteredResults, {extract: video => video.title}).map(e => e.original);
    callback(relatedVideos);
  });
}

exports.generateID = (callback) => {
  let newVideo = new Video({});
  newVideo.save((err, importedObject) => {
    if (err) return callback(null, new Error("Erreur lors de l'ajout de la nouvelle vidéo."));

    callback(importedObject._id);
  });
};

exports.update = (id, data, callback) => {
  Video.findById(id, (err, video) => {
    if (err) return callback({ok: false}, new Error(`Erreur lors de la récupération de la vidéo à mettre à jour. ID = ID = ${id}`));
    if (video === null || typeof video === 'undefined') return callback({ok: false});

    video.title = data.title;
    video.description = data.description;
    video.tags = data.tags;
    if (data.date) video.date = data.date;
    if (data.session) video.uploader = data.session._id;

    video.validated = true;

    video.save((err2) => {
      if (err2) return callback({ok: false}, new Error(`Erreur lors de la mise à jour de la vidéo. ID = ID = ${id}`));

      callback({ok: true});
    });
  });
};

exports.delete = (id, callback) => {
  Video.findByIdAndRemove(id, err => {
    if (err) return callback({ok: false}, new Error(`Erreur lors de la suppression de la vidéo. ID = ID = ${id}`));

    callback({ok: true});
  });
};
