( function ($, nonces, endpoints, gh) {

  const { currentUser, isSuperAdmin } = Groundhogg

  Groundhogg.user = {
    getCurrentUser: () => {
      return currentUser
    },
    userHasCap: (cap) => {
      return currentUser.allcaps[cap] || currentUser.caps[cap] || isSuperAdmin
    },
    getOwner: (id) => {
      return Groundhogg.filters.owners.find( u => u.ID == id )
    },
    getOwnerDisplayName: (id) => {
      return Groundhogg.filters.owners.find( u => u.ID == id ).data.display_name
    }
  }

  // Serialize better
  $.fn.serializeFormJSON = function () {

    var o = {}
    var a = this.serializeArray()
    $.each(a, function () {
      if (o[this.name]) {
        if (!o[this.name].push) {
          o[this.name] = [o[this.name]]
        }
        o[this.name].push(this.value || '')
      }
      else {
        o[this.name] = this.value || ''
      }
    })
    return o
  }

  function picker (selector, args) {
    return $(selector).select2(args)
  }

  $.fn.ghPicker = function ({
    endpoint,
    getResults = (r) => r.items,
    getParams = (q) => ( {
      ...q,
      search: q.term,
    } ),
    ...rest
  }) {

    this.select2({
      tokenSeparators: ['/', ',', ';'],
      delay: 100,
      ajax: {
        url: endpoint,
        // delay: 250,
        dataType: 'json',
        data: getParams,
        beforeSend: function (xhr) {
          xhr.setRequestHeader('X-WP-Nonce', nonces._wprest)
        },
        processResults: function (data, page) {
          return {
            results: getResults(data, page),
          }
        },
      },
      ...rest,
    })

    return this
  }

  /**
   * This is an API picker!
   *
   * @param selector
   * @param endpoint
   * @param multiple
   * @param tags
   * @param getResults
   * @param getParams
   * @param select2opts
   * @returns {*|define.amd.jQuery}
   */
  function apiPicker (
    selector,
    endpoint,
    multiple = false,
    tags = false,
    getResults = (d) => d.results,
    getParams = (q) => ( {
      ...q,
      search: q.term,
    } ),
    select2opts = {},
  ) {

    return $(selector).select2({
      tags: tags,
      multiple: multiple,
      tokenSeparators: ['/', ',', ';'],
      delay: 100,
      ajax: {
        url: endpoint,
        // delay: 250,
        dataType: 'json',
        data: getParams,
        beforeSend: function (xhr) {
          xhr.setRequestHeader('X-WP-Nonce', nonces._wprest)
        },
        processResults: function (data, page) {
          return {
            results: getResults(data, page),
          }
        },
      },
      ...select2opts,
    })
  }

  function linkPicker (selector) {
    let $input = $(selector)

    return $input.autocomplete({
      source: function (request, response) {
        $.ajax({
          url: ajaxurl,
          method: 'post',
          dataType: 'json',
          data: {
            action: 'wp-link-ajax',
            _ajax_linking_nonce: nonces._ajax_linking_nonce,
            term: request.term,
          },
          success: function (data) {
            var $return = []
            for (var item in data) {
              if (data.hasOwnProperty(item)) {
                item = data[item]
                $return.push({
                  label: item.title + ' (' + item.info + ')',
                  value: item.permalink,
                })
              }
            }
            response($return)
          },
          select: (e, ui) => {
            $input.value(ui.item.value).trigger('change')
          },

        })
      },
      minLength: 0,
    })
  }

  function userMetaPicker (selector) {
    let $input = $(selector)

    return $input.autocomplete({
      source: function (request, response) {
        $.ajax({
          url: ajaxurl,
          method: 'post',
          dataType: 'json',
          data: {
            action: 'user_meta_picker',
            nonce: nonces._meta_nonce,
            term: request.term,
          },
          success: function (data) {
            response(data)
            $(selector).removeClass('ui-autocomplete-loading')
          },
          select: (e, ui) => {
            $input.value(ui.item.value).trigger('change')
          },
        })
      },
      minLength: 0,
    })
  }

  function metaPicker (selector) {
    let $input = $(selector)

    return $input.autocomplete({
      source: function (request, response) {
        $.ajax({
          url: ajaxurl,
          method: 'post',
          dataType: 'json',
          data: {
            action: 'gh_meta_picker',
            nonce: nonces._meta_nonce,
            term: request.term,
          },
          success: function (data) {
            response(data)
            $(selector).removeClass('ui-autocomplete-loading')
          },
          select: (e, ui) => {
            $input.value(ui.item.value).trigger('change')
          },
        })
      },
      minLength: 0,
    })
  }

  function metaValuePicker (selector, meta_key) {

    let $input = $(selector)

    return $input.autocomplete({
      source: function (request, response) {
        $.ajax({
          url: ajaxurl,
          method: 'post',
          dataType: 'json',
          data: {
            action: 'gh_meta_value_picker',
            nonce: nonces._meta_nonce,
            term: request.term,
            meta_key,
          },
          success: function (data) {
            response(data)
            $(selector).removeClass('ui-autocomplete-loading')
          },
          select: (e, ui) => {
            $input.value(ui.item.value).trigger('change')
          },
        })
      },
      minLength: 0,
    })
  }

  /**
   * Api based tag picker
   *
   * @param selector
   * @param multiple
   * @param onReceiveItems
   * @param opts
   */
  function tagPicker (selector, multiple = true, onReceiveItems = (items) => {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.tags, multiple, Groundhogg.user.userHasCap('add_tags'),
      (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.data.tag_name }`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          limit: 50,
        }
      }, ...opts)
  }

  /**
   * Api based contact picker
   *
   * @param selector
   * @param onReceiveItems
   * @param opts
   */
  function contactPicker (selector, onReceiveItems = (items) => {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.contacts, false, false,
      (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.data.first_name } ${ item.data.last_name } (${ item.data.email })`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          limit: 50,
        }
      }, ...opts)
  }

  /**
   * Api based tag picker
   *
   * @param selector
   * @param multiple
   * @param onReceiveItems
   * @param opts
   */
  function campaignPicker (selector, multiple = true, onReceiveItems = (items) => {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.campaigns, multiple, true,
      (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.data.name }`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
        }
      }, ...opts)
  }

  /**
   * Api based email picker
   *
   * @param selector
   * @param multiple
   * @param onReceiveItems
   * @param queryOpts
   * @param opts
   */
  function emailPicker (selector, multiple = false, onReceiveItems = (items) => {}, queryOpts = {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.emails, multiple, false, (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.data.title } (${ item.data.status })`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          ...queryOpts,
        }
      }, ...opts)
  }

  /**
   * Api based funnel picker
   *
   * @param selector
   * @param multiple
   * @param onReceiveItems
   * @param queryOpts
   * @param opts
   */
  function funnelPicker (selector, multiple = false, onReceiveItems = (items) => {}, queryOpts = {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.funnels, multiple, false, (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.data.title }`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          ...queryOpts,
        }
      }, ...opts)
  }

  /**
   * Api based broadcast picker
   *
   * @param selector
   * @param multiple
   * @param onReceiveItems
   * @param queryOpts
   * @param opts
   */
  function broadcastPicker (selector, multiple = false, onReceiveItems = (items) => {}, queryOpts = {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.broadcasts, multiple, false, (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.ID,
          text: `${ item.object.data.title } (${ item.date_sent_pretty })`,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          ...queryOpts,
        }
      }, ...opts)
  }

  /**
   * Api based email picker
   *
   * @param selector
   * @param onReceiveItems
   * @param queryOpts
   * @param opts
   */
  function searchesPicker (selector, onReceiveItems = (items) => {}, queryOpts = {}, ...opts) {
    return apiPicker(selector, gh.api.routes.v4.searches, false, false, (data) => {

        onReceiveItems(data.items)

        return data.items.map(item => ( {
          id: item.id,
          text: item.name,
        } ))
      },
      (query) => {
        return {
          search: query.term,
          ...queryOpts,
        }
      }, ...opts)
  }

  function buildPickers () {
    picker('.gh-select2', {})
    tagPicker('.gh-tag-picker', true)
    tagPicker('.gh-single-tag-picker', false)
    emailPicker('.gh-email-picker', false)
    emailPicker('.gh-email-picker-multiple', true)
    apiPicker('.gh-sms-picker', endpoints.sms, false, false)
    contactPicker('.gh-contact-picker')
    contactPicker('.gh-contact-picker-multiple', (items) => {}, {
      multiple: true,
    })
    apiPicker('.gh-benchmark-picker', endpoints.benchmarks, false, false)
    apiPicker('.gh-metakey-picker', endpoints.metakeys, false, false)
    linkPicker('.gh-link-picker')
    metaPicker('.gh-meta-picker')
  }

  $(function () {
    buildPickers()
  })

  $(document).on('new-step gh-init-pickers', function () {
    buildPickers()
  })

  $(document).on('click', '.dropdown-button .button.dropdown', function () {
    var $button = $(this)
    $button.next().toggleClass('show')
    $('<div class=\'dropdown-overlay\'></div>').insertAfter($button)
  })

  $(document).on('click', '.dropdown-button .dropdown-overlay', function () {
    var $overlay = $(this)
    $overlay.next().toggleClass('show')
    $overlay.remove()
  })

  gh.pickers = {
    picker,
    tagPicker,
    emailPicker,
    apiPicker,
    linkPicker,
    metaPicker,
    userMetaPicker,
    campaignPicker,
    searchesPicker,
    funnelPicker,
    broadcastPicker,
    metaValuePicker,
    contactPicker,
  }

  // Map functions to Groundhogg object.
  gh.nonces = nonces
  gh.endpoints = endpoints

  if (!gh.functions) {
    gh.functions = {}
  }

  /**
   * Set a cookie
   *
   * @param cname
   * @param cvalue
   * @param duration in seconds
   */
  gh.functions.setCookie = (cname, cvalue, duration) => {
    var d = new Date()
    d.setTime(d.getTime() + ( duration * 1000 ))
    var expires = 'expires=' + d.toUTCString()
    document.cookie = cname + '=' + cvalue + ';' + expires + ';path=/'
  }

  /**
   * Retrieve a cookie
   *
   * @param cname name of the cookie
   * @param none default value
   * @returns {string|null}
   */
  gh.functions.getCookie = (cname, none = null) => {
    var name = cname + '='
    var ca = document.cookie.split(';')
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i]
      while (c.charAt(0) == ' ') {
        c = c.substring(1)
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length)
      }
    }
    return none
  }

  function utf8_to_b64 (str) {
    return window.btoa(unescape(encodeURIComponent(str)))
  }

  const base64_json_encode = (stuff) => {
    return utf8_to_b64(JSON.stringify(stuff)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
  }

  const assoc2array = (obj, a = 'id', b = 'text') => {
    let array = []
    Object.keys(obj).forEach(key => {
      array.push({ [a]: key, [b]: obj[key] })
    })

    return array
  }

  gh.functions.utf8_to_b64 = utf8_to_b64
  gh.functions.base64_json_encode = base64_json_encode
  gh.functions.assoc2array = assoc2array

} )(jQuery, groundhogg_nonces, groundhogg_endpoints, Groundhogg)
