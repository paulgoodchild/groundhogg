( ($) => {

  const { propertiesEditor } = Groundhogg
  const { createFilters } = Groundhogg.filters.functions
  const {
    input,
    progressModal,
    select,
    confirmationModal,
    dialog,
    bold,
    adminPageURL,
    loadingModal,
    inputRepeaterWidget,
  } = Groundhogg.element
  const {
    betterTagPicker,
  } = Groundhogg.components
  const { post, get, patch, routes, ajax } = Groundhogg.api
  const {
    searches: SearchesStore,
    contacts: ContactsStore,
    tags: TagsStore,
    funnels: FunnelsStore,
  } = Groundhogg.stores
  const { tagPicker, funnelPicker } = Groundhogg.pickers
  const { userHasCap } = Groundhogg.user
  const {
    formatNumber,
    formatTime,
    formatDate,
    formatDateTime,
  } = Groundhogg.formatting
  const { sprintf, __, _x, _n } = wp.i18n

  const fieldSection = ({
    title = '',
    fields = '',
  }) => {

    // language=HTML
    return `
        <div class="gh-panel">
            <div class="gh-panel-header">
                <h2>${ title }</h2>
                <button type="button" class="toggle-indicator"
                        aria-expanded="true"></button>
            </div>
            <div class="inside">
                ${ fields }
            </div>
        </div>`

  }

  let sections = [

    {
      title: __('General', 'groundhogg'),
      // language=HTML
      fields: `
          <div class="gh-rows-and-columns">
              <div class="gh-row">
                  <div class="gh-col">
                      <label for="email">${ __('Optin Status',
                              'groundhogg') }</label>
                      ${ select({
                          id: `optin-status`,
                          name: 'optin_status',
                      }, {
                        0 : __('No change', 'groundhogg'),
                        ...Groundhogg.filters.optin_status 
                      }) }
                  </div>
                  <div class="gh-col">
                      <label for="owner">${ __('Owner',
                              'noun the contact owner', 'groundhogg') }</label>
                      ${ select({
                          id: `owner`,
                          name: 'owner_id',
                      }, [
                          { value: 0, text: __('No change', 'groundhogg')},
                      ...Groundhogg.filters.owners.map(u => ( {
                          text: `${ u.data.display_name } (${ u.data.user_email })`,
                          value: u.ID,
                      } )) ]) }
                  </div>
              </div>
          </div>`,
      onMount: ({ updateData }) => {

        $('#owner, #optin-status').on('change', e => {
          updateData({
            [e.target.name]: e.target.value,
          })
        })

      },
    },
    {
      title: __('Location', 'groundhogg'),
      // language=HTML
      fields: `
          <div class="gh-rows-and-columns">
              <div class="gh-row">
                  <div class="gh-col">
                      <label for="line1">${ __('Line 1', 'groundhogg') }</label>
                      ${ input({
                          id: 'line1',
                          name: 'street_address_1',
                      }) }
                  </div>
                  <div class="gh-col">
                      <label for="line2">${ __('Line 2', 'groundhogg') }</label>
                      ${ input({
                          id: 'line2',
                          name: 'street_address_2',
                      }) }
                  </div>
              </div>
              <div class="gh-row">
                  <div class="gh-col">
                      <label for="city">${ __('City', 'groundhogg') }</label>
                      ${ input({
                          id: 'city',
                          name: 'city',
                      }) }
                  </div>
                  <div class="gh-col">
                      <label for="postal_zip">${ __('Postal/Zip Code',
                              'groundhogg') }</label>
                      ${ input({
                          id: 'postal_zip',
                          name: 'postal_zip',
                      }) }
                  </div>
              </div>
              <div class="gh-row">
                  <div class="gh-col">
                      <label for="region">${ __('State', 'groundhogg') }</label>
                      ${ input({
                          id: 'region',
                          name: 'region',
                      }) }
                  </div>
                  <div class="gh-col">
                      <label for="country">${ __('Country',
                              'groundhogg') }</label>
                      ${ select({
                          id: 'country',
                          name: 'country',
                      }, {
                          0: __('Select a country', 'groundhogg'),
                          ...BulkEdit.countries,
                      }) }
                  </div>
              </div>
              <div class="gh-row">
                  <div class="gh-col">
                      <label for="time-zone">${ __('Time Zone',
                              'groundhogg') }</label>
                      ${ select({
                          id: 'time-zone',
                          name: 'time_zone',
                      }, {
                          0: __('Select a time zone', 'groundhogg'),
                          ...BulkEdit.time_zones,
                      }) }
                  </div>
                  <div class="gh-col">
                      <label for="locale">${ __('Locale',
                              'groundhogg') }</label>
                      ${ BulkEdit.language_dropdown }
                  </div>
              </div>
          </div>`,
      onMount: ({ updateData }) => {

        $('').on('change', e => {
          updateData({
            [e.target.name]: e.target.value,
          })
        })

        $('#locale, #time-zone, #country').select2()

      },
    },
    {
      title: '<span class=" dashicons dashicons-tag"></span>' +
        __('Apply Tags', 'groundhogg'),
      // language=HTML
      fields: `
          <div id="apply-tags"></div>`,
      onMount: ({ setInPayload }) => {
        betterTagPicker('#apply-tags', {
          onChange: ({ addTags }) => {
            setInPayload({
              add_tags: addTags,
            })
          },
        })
      },
    },
    {
      title: '<span class=" dashicons dashicons-tag"></span>' +
        __('Remove Tags', 'groundhogg'),
      // language=HTML
      fields: `
          <div id="remove-tags"></div>`,
      onMount: ({ setInPayload }) => {
        betterTagPicker('#remove-tags', {
          onChange: ({ addTags }) => {
            setInPayload({
              remove_tags: addTags,
            })
          },
        })
      },
    },

  ]

  if (BulkEdit.gh_contact_custom_properties) {
    BulkEdit.gh_contact_custom_properties.tabs.forEach(t => {

      // Groups belonging to this tab
      let groups = BulkEdit.gh_contact_custom_properties.groups.filter(
        g => g.tab === t.id)
      // Fields belonging to the groups of this tab
      let fields = BulkEdit.gh_contact_custom_properties.fields.filter(
        f => groups.find(g => g.id === f.group))

      sections.push({
        title: t.name,
        fields: `<div id="${ t.id }"></div>`,
        onMount: ({ updateMeta }) => {
          propertiesEditor(`#${ t.id }`, {
            values: {},
            properties: {
              groups,
              fields,
            },
            onChange: (meta) => {
              updateMeta(meta)
            },
            canEdit: () => false,

          })
        },
      })

    })
  }

  const sanitizeKey = (label) => {
    return label.toLowerCase().replace(/[^a-z0-9]/g, '_')
  }

  sections.push({
    title: __('Custom Meta', 'groundhogg'),
    // language=HTML
    fields: `
        <div id="meta-list"></div>`,
    onMount: ({ updateMeta, deleteMeta }) => {
      inputRepeaterWidget({
        selector: '#meta-list',
        rows: [],
        cellProps: [
          {
            className: 'meta-key',
          }, {},
        ],
        cellCallbacks: [input, input],
        onMount: () => {

          $('.meta-key').on('input', (e) => {
            let key = sanitizeKey(e.target.value)
            $(e.target).val(key)
          })
        },
        onChange: (rows) => {

          rows.forEach(([key, value]) => {

            if (!key) {
              return
            }

            updateMeta({
              [key]: value,
            })
          })
        },
        onRemove: ([key, value]) => {

          if (!key) {
            return
          }

          deleteMeta(key)
        },
      }).mount()
    },
  })

  const template = () => {

    //language=HTML
    return `
        <div id="bulk-edit-inside">
            <div class="include-filters-wrap">
                <div class="include-block">${ __(
                        'Include') }
                </div>
                <div id="filters"></div>
            </div>
            <div class="exclude-filters-wrap">
                <div class="exclude-block">${ __(
                        'Exclude') }
                </div>
                <div id="exclude-filters"></div>
            </div>
            <div id="edit-fields">
                ${ sections.map(
                        ({ title, fields }) => fieldSection({ title, fields })).
                        join('') }
            </div>
            <p>
                <button id="commit" class="gh-button primary">${ __('Commit') }
                </button>
            </p>
        </div>`
  }

  const { query } = BulkEdit
  let totalContacts = 0

  let data = {}, meta = {}

  let payload = {
    add_tags: [],
    remove_tags: [],
  }

  const updateData = (_data) => {
    data = {
      ...data,
      ..._data,
    }
  }

  const updateMeta = (_meta) => {
    meta = {
      ...meta,
      ..._meta,
    }
  }

  const deleteMeta = (key) => {
    delete meta[key]
  }

  const setInPayload = (_p) => {
    payload = {
      ...payload,
      ..._p,
    }
  }

  const fetchContactCount = () => {
    return ContactsStore.count({
      ...query,
    }).then((t) => {
      totalContacts = t
    })
  }

  const setCommitText = () => {
    $('#commit').text(sprintf(
      _n('Edit %s contact', 'Edit %s contacts', totalContacts,
        'groundhogg'), formatNumber(totalContacts)))
  }

  const mount = () => {
    $('#bulk-edit').html(template())

    createFilters('#filters', query.filters, (filters) => {
      query.filters = filters
      fetchContactCount().then(setCommitText)
    }).init()
    createFilters('#exclude-filters', query.exclude_filters,
      (filters) => {
        query.exclude_filters = filters
        fetchContactCount().then(setCommitText)
      }).init()

    // Used the INCLUDE from the multi select
    if (query.include) {
      $('.include-filters-wrap, .exclude-filters-wrap').addClass('hidden')
    }

    sections.forEach(
      s => s.onMount({ updateData, updateMeta, deleteMeta, setInPayload }))

    $('.toggle-indicator').on('click', e => {
      $(e.target).closest('.gh-panel').toggleClass('closed')
    })

    $('#commit').on('click', () => {

      console.log({
        meta,
        data,
        ...payload,
      })

      confirmationModal({
        alert: `<p>${ sprintf(__(
          'Are you sure you want to edit %s contacts? This action cannot be undone.',
          'groundhogg'), bold(formatNumber(totalContacts))) }</p>`,
        onConfirm: () => {
          progressModal({
            beforeProgress: () => {
              return `<h2>${ __('Updating Contacts...',
                'groundhogg') }</h2><p class="gh-text danger">${ __(
                'Do not close this window!') }</p>`
            },
            onOpen: ({ setProgress, close }) => {

              let offset = 0
              let limit = 500

              const patchContacts = () => {

                ContactsStore.patchMany({
                  query: {
                    ...query,
                    offset,
                    limit,
                  },
                  data,
                  meta,
                  ...payload,
                }).then(r => {

                  offset += limit

                  setProgress(( offset / totalContacts ) * 100)

                  if (offset < totalContacts) {
                    patchContacts()
                    return
                  }

                  dialog({
                    message: __('Contacts updated!', 'groundhogg'),
                  })

                  window.open(adminPageURL('gh_contacts'), '_self')
                  // close()
                })

              }

              patchContacts()
            },
          })
        },
      })
    })
  }

  $(() => {

    const { close } = loadingModal()

    fetchContactCount().then(() => {
      mount()
      setCommitText()
      close()
    })

  })

} )(jQuery)