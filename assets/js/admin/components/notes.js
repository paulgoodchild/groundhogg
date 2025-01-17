( ($) => {

  const { notes: NotesStore } = Groundhogg.stores
  const {
    icons,
    select,
    tinymceElement,
    addMediaToBasicTinyMCE,
    moreMenu,
    spinner,
    tooltip,
    dangerConfirmationModal,
  } = Groundhogg.element
  const { post, get, patch, routes, ajax } = Groundhogg.api
  const { userHasCap } = Groundhogg.user
  const { formatNumber, formatTime, formatDate, formatDateTime } = Groundhogg.formatting
  const { sprintf, __, _x, _n } = wp.i18n

  const typeToIcon = {
    call: icons.phone,
    note: icons.note,
    email: icons.email,
    meeting: icons.contact,
  }

  const noteTypes = {
    note: __('Note', 'groundhogg'),
    call: __('Call', 'groundhogg'),
    email: __('Email', 'groundhogg'),
    meeting: __('Meeting', 'groundhogg'),
  }

  const templates = {

    notes: (notes, adding = false, editing = false, title) => {

      // language=HTML
      return `
          <div class="notes-widget">
              <div class="notes-header">
                  <h3>${ title }</h3>
                  <button class="gh-button text icon secondary note-add">
                      <span class="dashicons dashicons-plus-alt2"></span>
                  </button>
              </div>
              <div class="notes">
                  ${ adding ? templates.addNote() : `` }
                  ${ notes.sort((a, b) => b.data.timestamp - a.data.timestamp).
                          map(n => editing == n.ID ? templates.editNote(n) : templates.note(n)).
                          join('') }
              </div>
          </div>`
    },

    editNote: (note) => {
      // language=HTML
      return `
          <div class="add-note">
              <textarea id="edit-note-editor">${ note.data.content }</textarea>
              <div class="actions">
                  <div>
                      <label>${ __('Note type', 'groundhogg') }
                          ${ select({ id: 'note-type' }, noteTypes, note.data.type) }</label>
                  </div>
                  <div style="display: flex">
                      <button class="gh-button danger text cancel">${ __('Cancel') }</button>
                      <button class="gh-button primary save">${ __('Save') }</button>
                  </div>
              </div>
          </div>`
    },
    addNote: () => {
      // language=HTML
      return `
          <div class="add-note">
              <textarea id="add-note-editor"></textarea>
              <div class="actions">
                  <div>
                      <label>${ __('Note type', 'groundhogg') }
                          ${ select({ id: 'note-type' }, noteTypes) }</label>
                  </div>
                  <div style="display: flex">
                      <button class="gh-button danger text cancel">${ __('Cancel') }</button>
                      <button class="gh-button primary create">${ __('Create') }</button>
                  </div>
              </div>
          </div>`
    },

    note: (note) => {

      const { content, type, context, user_id, date_created, timestamp } = note.data

      const addedBy = () => {

        let date_created = `<abbr title="${ formatDateTime( note.data.date_created ) }">${ note.i18n.time_diff }</abbr>`

        switch (context) {
          case 'user':
            let user = Groundhogg.filters.owners.find(o => o.ID == user_id)
            let username

            if (!user) {
              username = __('Unknown')
            }
            else {
              username = user.ID == Groundhogg.currentUser.ID ? __('me') : user.data.display_name
            }

            return sprintf(__('Added by %s %s ago', 'groundhogg'), username, date_created)

          default:
          case 'system':
            return sprintf(__('Added by %s %s ago', 'groundhogg'), __('System'), date_created)
          case 'funnel':
            return sprintf(__('Added by %s %s ago', 'groundhogg'), __('Funnel'), date_created)
        }
      }

      // language=HTML
      return `
          <div class="note">
              <div class="icon">
                  ${ typeToIcon[type] }
              </div>
              <div style="width: 100%">
                  <div class="note-header">
                      <span class="added-by">${ addedBy() }</span>
                      <div class="actions">
                          <button class="gh-button text icon secondary note-more" data-id="${ note.ID }">
                              ${ icons.verticalDots }
                          </button>
                      </div>
                  </div>
                  <div class="note-content">
                      ${ content }
                  </div>
              </div>

          </div>`
    },

  }

  const Notes = (selector, {
    object_type = '',
    object_id = 0,
    title = __('Notes', 'groundhogg'),
  }) => {

    let state = {
      adding: false,
      editing: false,
    }

    const $el = $(selector)

    const render = () => {

      try {
        wp.editor.remove('edit-note-editor')
        wp.editor.remove('add-note-editor')
      } catch (e) {

      }

      const notes = NotesStore.filter(({ data }) => data.object_type == object_type && data.object_id == object_id).
        sort((a, b) => b.data.timestamp - a.data.timestamp)

      $el.html(templates.notes(notes, state.adding, state.editing, title))
      onMount()
    }

    const onMount = () => {

      const addNote = () => {
        if (state.editing) {
          wp.editor.remove('edit-note-editor')
          state.editing = false
        }

        state.adding = true

        render()
      }

      const editNote = (id) => {

        if (state.adding) {
          wp.editor.remove('add-note-editor')
          state.adding = false
        }

        if (state.editing) {
          wp.editor.remove('edit-note-editor')
        }

        state.editing = id

        render()
      }

      $(`${ selector } .note-add`).on('click', () => {

        if (this.adding) {
          return
        }

        addNote()
      })

      if (!userHasCap('add_notes')) {
        $('.note-add').remove()
      }

      tooltip(`${ selector } .note-add`, {
        content: __('Add Note', 'groundhogg'),
        position: 'left',
      })

      if (state.adding) {

        const newNote = {
          object_id,
          object_type,
          content: '',
          type: 'note',
        }

        addMediaToBasicTinyMCE()

        let editor = tinymceElement('add-note-editor', {
          quicktags: false,
        }, (content) => {
          newNote.content = content
        })

        $(`${ selector } #note-type`).on('change', (e) => {
          newNote.type = e.target.value
        })

        $(`${ selector } .cancel`).on('click', () => {
          state.adding = false
          render()
        })

        $(`${ selector } .create`).on('click', () => {
          state.adding = false
          state.editing = false

          NotesStore.post({
            data: {
              ...newNote,
              content: editor.getContent({ format: 'raw' }),
            },
          }).then(() => {
            render()
          })
        })
      }
      else if (state.editing) {

        const editedNote = NotesStore.get(state.editing)

        const updateNote = {
          content: editedNote.data.content,
          type: editedNote.data.type,
        }

        let editor = tinymceElement('edit-note-editor', {
          quicktags: false,
        }, (content) => {
          updateNote.content = content
        })

        $(`${ selector } #note-type`).on('change', (e) => {
          updateNote.type = e.target.value
        })

        $(`${ selector } .cancel`).on('click', () => {
          state.editing = false
          render()
        })

        $(`${ selector } .save`).on('click', () => {
          state.adding = false

          NotesStore.patch(state.editing, {
            data: {
              ...updateNote,
              content: editor.getContent({ format: 'raw' }),
            },
          }).then(() => {
            state.editing = false
            render()
          })
        })
      }

      $(`${ selector } .note-more`).on('click', (e) => {

        const curNote = parseInt(e.currentTarget.dataset.id)
        const note = () => NotesStore.get(curNote)
        const belongsToMe = () => note().data.user_id == Groundhogg.currentUser.ID

        moreMenu(e.currentTarget, {
          items: [
            {
              key: 'edit',
              cap: belongsToMe() ? 'edit_notes' : 'edit_others_notes',
              text: __('Edit'),
            },
            {
              key: 'delete',
              cap: belongsToMe() ? 'delete_notes' : 'delete_others_notes',
              text: `<span class="gh-text danger">${ __('Delete') }</span>`,
            },
          ].filter(i => userHasCap(i.cap)),
          onSelect: (k) => {
            switch (k) {
              case 'edit':
                editNote(curNote)
                break
              case 'delete':

                dangerConfirmationModal({
                  alert: `<p>${ __('Are you sure you want to delete this note?', 'groundhogg') }</p>`,
                  onConfirm: () => {
                    NotesStore.delete(curNote).then(() => render())
                  },
                })

                break
            }
          },
        })
      })
    }

    if (!NotesStore.filter(n => n.data.object_type == object_type && n.data.object_id == object_id).length) {
      $el.html(spinner())
      NotesStore.fetchItems({
        object_id,
        object_type,
        limit: 9999,
      }).then(() => {
        render()
      })
    }
    else {
      render()
    }
  }

  Groundhogg.noteEditor = Notes

} )(jQuery)
