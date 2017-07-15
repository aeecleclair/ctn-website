let mongoose = require('mongoose');

let newsSchema = new mongoose.Schema({
  title: String,
  text: String,
  writer: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  date: {type: Date, default: Date.now},
  image: Buffer,
  thumbnail: Buffer,
  href: String
});

let News = mongoose.model('News', newsSchema);
exports.model = News;

exports.create = (infos, callback) => {
  let schema = {
    title: infos.title,
    text: infos.text,
    writer: infos.session._id,
    date: infos.date,
    image: infos.image,
    thumbnail: infos.thumbnail,
    href: infos.href
  }
  let newNews = new News(schema);
  newNews.save((err, result) => {
    if (err) return callback(null, new Error("Erreur lors de la création de la nouvelle news."));
    callback(result._id);
  });
}

exports.return = (id, callback) => {
  if (id === null) {
    News.find({}).populate('writer').sort('-creationDate').limit(5).exec((err, result) => {
      if (err) return callback(null, new Error('Erreur lors de la récupération de la liste des news.'));
      if (result === null || typeof result === 'undefined') return callback(null);

      let filteredResults = result.map(obj => {
        let filteredObj = obj.toJSON();
        if (obj.writer) filteredObj.writer = obj.writer.surname;
        //filteredObj.image = Buffer.from(filteredObj.image.data).toString();
        //filteredObj.image = 'data:image/jpeg;base64,' + Buffer.from(filteredObj.image.data).toString('base64');
        filteredObj.thumbnail = 'data:image/jpeg;base64,' + Buffer.from(filteredObj.thumbnail.data).toString('base64');
        return filteredObj;
      });
      callback(filteredResults);
    });
  }
  else {
    News.findById(id).populate('writer').exec((err, result) => {
      if (err) return callback(null, new Error('Erreur lors de la récupération de la news. ID = ' + id));
      if (result === null || typeof result === 'undefined') return callback(null);

      let filteredResult = result.toJSON();
      filteredResult.image = 'data:image/jpeg;base64,' + Buffer.from(filteredResult.image.data).toString('base64');
      filteredResult.thumbnail = 'data:image/jpeg;base64,' + Buffer.from(filteredResult.thumbnail.data).toString('base64');

      if (typeof filteredResult.writer !== 'undefined') filteredResult.writer = result.writer.surname;

      callback(filteredResult);
    });
  }
}

exports.returnList = exports.return.bind(this, null);

exports.update = (id, update, callback) => {
  News.findById(id, (err, news) => {
    if (err) return callback({ok: false}, new Error(`Erreur lors de la récupération de la news à mettre à jour. ID =${id}`));
    if (news === null || typeof news === 'undefined') return callback({ok: false});

    if (update.title) news.title = update.title;
    if (update.text) news.text = update.text;
    if (update.image) news.image = update.image;
    if (update.thumbnail) news.image = update.image;
    if (update.href) news.href = update.href;

    news.save((err2) => {
      if (err2) return callback({ok: false}, new Error(`Erreur lors de la mise à jour de la news. ID =${id}`));
      callback({ok: true});
    });
  });
}

exports.delete = (id, callback) => {
  News.findByIdAndRemove(id, (err, result) => {
    if (err) return callback({ok: false}, new Error(`Erreur lors de la suppression de la news. ID =${id}`));
    callback({ok: true});
  });
}
