// Generated by IcedCoffeeScript 1.6.2c
(function() {
  var BoundingBox, DEFAULTS, SegmentTree, Utils;



  BoundingBox = require('./bounding-box').BoundingBox;

  Utils = require('./utils').Utils;

  /*
  
  a segment is a pair of points, where each point is an N-dimensional
  array, and some object you want associated with that segment
  
  Example:
    new SegmentTree {
      insertions: [
        {object: o1, segment: [[1, 2], [3,  10]}
        {object: o2, segment: [[3, 5], [3,  10]}
      ]
      dimensions:   2
      min_to_split: 8
      split_gain:   0.40 #  when a tree subdivides, 
                         #  x% go solely into one subtree, 
                         #  y% go solely into another,
                         #  Only subdivide if x and y are both greater than split_gain
    }
  */


  DEFAULTS = {
    SPLIT_GAIN: 0.4,
    MIN_TO_SPLIT: 6
  };

  SegmentTree = (function() {
    function SegmentTree(_arg) {
      var dimensions, id, insertion, insertions, min_to_split, split_gain, _i, _len;
      insertions = _arg.insertions, dimensions = _arg.dimensions, split_gain = _arg.split_gain, min_to_split = _arg.min_to_split;
      this.split_gain = split_gain || DEFAULTS.SPLIT_GAIN;
      this.min_to_split = min_to_split || DEFAULTS.MIN_TO_SPLIT;
      this.dimensions = dimensions;
      this.tree = this._new_tree();
      this.by_id = {};
      this.id_count = 0;
      this.num_trees = 1;
      if (insertions != null ? insertions.length : void 0) {
        for (_i = 0, _len = insertions.length; _i < _len; _i++) {
          insertion = insertions[_i];
          id = this._record_and_get_id(insertion);
          this._add(id, insertion.segment, this.tree, 0);
        }
        this._perform_splits(this.tree, 0);
      }
    }

    SegmentTree.prototype.add = function(_arg) {
      var id, object, segment;
      object = _arg.object, segment = _arg.segment;
      id = this._record_and_get_id({
        object: object,
        segment: segment
      });
      this._add(id, segment, this.tree, 0);
      return id;
    };

    SegmentTree.prototype.nearest_segment = function(tuple) {
      return this._find_nearest_segment(tuple, this.tree);
    };

    SegmentTree.prototype.nearest_vertex = function(tuple) {
      return this._find_nearest_vertex(tuple, this.tree);
    };

    SegmentTree.prototype.summarize = function() {
      return {
        num_trees: this.num_trees,
        num_objs: this.get_all_objs().length
      };
    };

    SegmentTree.prototype.get_all_objs = function() {
      var k, v, _ref, _results;
      _ref = this.by_id;
      _results = [];
      for (k in _ref) {
        v = _ref[k];
        _results.push(v.o);
      }
      return _results;
    };

    SegmentTree.prototype._record_and_get_id = function(insertion) {
      var id;
      id = this.id_count++;
      this.by_id[id] = {
        o: insertion.object,
        segment: insertion.segment
      };
      return id;
    };

    SegmentTree.prototype._new_tree = function() {
      return {
        items: [],
        left: null,
        right: null,
        axis: null,
        divider: null,
        bounds: null
      };
    };

    SegmentTree.prototype._perform_splits = function(tree, depth) {
      var _ref;
      if ((_ref = tree.items) != null ? _ref.length : void 0) {
        this._maybe_split(tree, depth);
      }
      if (tree.left != null) {
        this._perform_splits(tree.left, depth + 1);
        return this._perform_splits(tree.right, depth + 1);
      }
    };

    SegmentTree.prototype._add = function(id, segment, tree, depth) {
      if (tree.bounds != null) {
        tree.bounds.contain(segment[0]);
        tree.bounds.contain(segment[1]);
      } else {
        tree.bounds = new BoundingBox(segment[0], segment[1]);
      }
      if (tree.axis != null) {
        if (this._is_on_left(segment, tree.axis, tree.divider)) {
          this._add(id, segment, tree.left, depth + 1);
        }
        if (this._is_on_right(segment, tree.axis, tree.divider)) {
          return this._add(id, segment, tree.right, depth + 1);
        }
      } else {
        return tree.items.push({
          id: id,
          segment: segment
        });
      }
    };

    SegmentTree.prototype._find_nearest_vertex = function(tuple, tree) {
      var closest_item, closest_item_dsq, closest_vertex, dsq, i, item, left_best, left_info, right_best, right_info, _i, _len, _ref;
      if (tree.axis != null) {
        left_info = tree.left.bounds.distance_from_vec(tuple);
        right_info = tree.right.bounds.distance_from_vec(tuple);
        if (left_info.distance < right_info.distance) {
          left_best = this._find_nearest_vertex(tuple, tree.left);
          if (left_best.distance < right_info.distance) {
            return left_best;
          }
          right_best = this._find_nearest_vertex(tuple, tree.right);
        } else {
          right_best = this._find_nearest_vertex(tuple, tree.right);
          if (right_best.distance < left_info.distance) {
            return right_best;
          }
          left_best = this._find_nearest_vertex(tuple, tree.left);
        }
        if (left_best.distance < right_best.distance) {
          return left_best;
        } else {
          return right_best;
        }
      } else {
        if (!tree.items.length) {
          return {
            distance: Infinity,
            vertex: null,
            object: null
          };
        } else {
          closest_item = null;
          closest_vertex = null;
          closest_item_dsq = null;
          _ref = tree.items;
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            item = _ref[i];
            dsq = Utils.dist_sq(tuple, item.segment[0]);
            if ((!i) || dsq < closest_item_dsq) {
              closest_item = item;
              closest_vertex = item.segment[0];
              closest_item_dsq = dsq;
            }
            dsq = Utils.dist_sq(tuple, item.segment[1]);
            if (dsq < closest_item_dsq) {
              closest_item = item;
              closest_vertex = item.segment[1];
              closest_item_dsq = dsq;
            }
          }
          return {
            vertex: closest_vertex,
            distance: Math.sqrt(closest_item_dsq),
            object: this.by_id[closest_item.id].o
          };
        }
      }
    };

    SegmentTree.prototype._find_nearest_segment = function(tuple, tree) {
      var closest_item, closest_item_info, i, info, item, left_best, left_info, right_best, right_info, _i, _len, _ref;
      if (tree.axis != null) {
        left_info = tree.left.bounds.distance_from_vec(tuple);
        right_info = tree.right.bounds.distance_from_vec(tuple);
        if (left_info.distance < right_info.distance) {
          left_best = this._find_nearest_segment(tuple, tree.left);
          if (left_best.distance < right_info.distance) {
            return left_best;
          }
          right_best = this._find_nearest_segment(tuple, tree.right);
        } else {
          right_best = this._find_nearest_segment(tuple, tree.right);
          if (right_best.distance < left_info.distance) {
            return right_best;
          }
          left_best = this._find_nearest_segment(tuple, tree.left);
        }
        if (left_best.distance < right_best.distance) {
          return left_best;
        } else {
          return right_best;
        }
      } else {
        if (!tree.items.length) {
          return {
            distance: Infinity,
            point: null,
            segment: null,
            object: null
          };
        } else {
          closest_item = null;
          closest_item_info = null;
          _ref = tree.items;
          for (i = _i = 0, _len = _ref.length; _i < _len; i = ++_i) {
            item = _ref[i];
            info = Utils.point_segment_dist(tuple, item.segment);
            if ((!i) || info.dist < closest_item_info.dist) {
              closest_item = item;
              closest_item_info = info;
            }
          }
          return {
            distance: closest_item_info.dist,
            point: closest_item_info.point,
            segment: closest_item.segment,
            object: this.by_id[closest_item.id].o
          };
        }
      }
    };

    SegmentTree.prototype._maybe_split = function(tree, depth) {
      var axis, ni, sc, split_candidates;
      ni = tree.items.length;
      if (ni < this.min_to_split) {
        return;
      }
      split_candidates = (function() {
        var _i, _ref, _results;
        _results = [];
        for (axis = _i = 0, _ref = this.dimensions; 0 <= _ref ? _i < _ref : _i > _ref; axis = 0 <= _ref ? ++_i : --_i) {
          _results.push(this._get_split_candidate(tree, axis));
        }
        return _results;
      }).call(this);
      split_candidates.sort(function(a, b) {
        return b.split_gain - a.split_gain;
      });
      if ((sc = split_candidates[0]).split_gain >= this.split_gain) {
        return this._split(tree, sc.axis, sc.divider, depth);
      }
    };

    SegmentTree.prototype._is_on_left = function(segment, axis, divider) {
      var n1, n2;
      n1 = segment[0][axis];
      n2 = segment[1][axis];
      return (n1 <= divider) || (n2 <= divider);
    };

    SegmentTree.prototype._is_on_right = function(segment, axis, divider) {
      var n1, n2;
      n1 = segment[0][axis];
      n2 = segment[1][axis];
      return (n1 > divider) || (n2 > divider);
    };

    SegmentTree.prototype._split = function(tree, axis, divider, depth) {
      var i, to_move, _i, _len, _results;
      tree.left = this._new_tree();
      tree.right = this._new_tree();
      tree.axis = axis;
      tree.divider = divider;
      to_move = tree.items;
      tree.items = null;
      this.num_trees++;
      _results = [];
      for (_i = 0, _len = to_move.length; _i < _len; _i++) {
        i = to_move[_i];
        _results.push(this._add(i.id, i.segment, tree, depth + 1));
      }
      return _results;
    };

    SegmentTree.prototype._get_split_candidate = function(tree, axis) {
      var i, left_points, p, points, res, right_points, _i, _j, _len, _len1;
      res = {
        divider: null,
        split_gain: null,
        axis: axis
      };
      left_points = (function() {
        var _i, _len, _ref, _results;
        _ref = tree.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(i.segment[0][axis]);
        }
        return _results;
      })();
      right_points = (function() {
        var _i, _len, _ref, _results;
        _ref = tree.items;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          i = _ref[_i];
          _results.push(i.segment[1][axis]);
        }
        return _results;
      })();
      points = [];
      for (_i = 0, _len = left_points.length; _i < _len; _i++) {
        p = left_points[_i];
        points.push(p);
      }
      for (_j = 0, _len1 = right_points.length; _j < _len1; _j++) {
        p = right_points[_j];
        points.push(p);
      }
      res.divider = Utils.median(points);
      res.split_gain = this._calc_split_gain(tree.items, axis, res.divider);
      return res;
    };

    SegmentTree.prototype._calc_split_gain = function(items, axis, divider) {
      var duplicates, item, left_count, lsc, right_count, rsc, s, _i, _len;
      left_count = 0;
      right_count = 0;
      for (_i = 0, _len = items.length; _i < _len; _i++) {
        item = items[_i];
        s = item.segment;
        if (this._is_on_left(s, axis, divider)) {
          left_count++;
        }
        if (this._is_on_right(s, axis, divider)) {
          right_count++;
        }
      }
      duplicates = left_count + right_count - items.length;
      lsc = left_count - duplicates;
      rsc = right_count - duplicates;
      return Math.min(lsc / items.length, rsc / items.length);
    };

    return SegmentTree;

  })();

  exports.SegmentTree = SegmentTree;

}).call(this);