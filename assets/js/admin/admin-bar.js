(function ($) {

  const classPrefix = 'groundhogg-toolbar-quick-search'

  const {
    moreMenu,
    input,
    select,
    tooltip,
    loadingDots,
    isValidEmail,
    dialog,
    errorDialog,
    clickedIn,
    icons,
    adminPageURL
  } = Groundhogg.element

  const { userHasCap } = Groundhogg.user
  const { sprintf, __, _x, _n } = wp.i18n
  const { formatNumber, formatTime, formatDate, formatDateTime } = Groundhogg.formatting

  const { tagPicker } = Groundhogg.pickers

  const {
    contacts: ContactsStore
  } = Groundhogg.stores

  const Tabs = {
    search_contacts: {
      tooltip: `Search for contacts`,
      cap: 'view_contacts',
      // language=HTML
      svg: icons.contactSearch,
      view: () => {

        // language=HTML
        return `
			<div id="quick-search-wrap">
				${input({
					type: 'search',
					id: 'quick-search-input',
					placeholder: __('Search by name or email...', 'groundhogg')
				})}
				<div class="${classPrefix}-results"></div>
			</div>`
      },
      onMount: () => {

        const mountSearchResults = (items, search) => {
          $(`.${classPrefix}-results`).replaceWith(renderSearchResults(items, search))

          tooltip(`.${classPrefix}-result .edit-profile`, {
            content: __('Edit profile', 'groundhogg'),
            position: 'top'
          })

          tooltip(`.${classPrefix}-result .send-email`, {
            content: __('Send email', 'groundhogg'),
            position: 'top'
          })

          tooltip(`.${classPrefix}-result .call-primary`, {
            content: __('Call', 'groundhogg'),
            position: 'top'
          })

          tooltip(`.${classPrefix}-result .call-mobile`, {
            content: __('Call mobile', 'groundhogg'),
            position: 'top'
          })

          $(`.${classPrefix}-result`).on('click', (e) => {

            if (clickedIn(e, '.email-contact')) {
              return
            }

            if (clickedIn(e, '.call-primary')) {
              return
            }

            if (clickedIn(e, '.call-mobile')) {
              return
            }

            const ID = parseInt(e.currentTarget.dataset.contact)
            const contact = ContactsStore.get(ID)

            window.location.href = contact.admin
          })
        }

        const renderSearchResult = (item) => {

          //language=HTML
          return `
			  <div id="search-result-${item.ID}" data-contact="${item.ID}" class="${classPrefix}-result">
				  <img class="avatar" src="${item.data.gravatar}" alt="avatar"/>
				  <div class="details">
					  <div class="name">${item.data.first_name} ${item.data.last_name}</div>
					  <div class="email">${item.data.email}</div>
				  </div>
				  <div class="actions">
					  <button class="gh-button secondary text icon edit-profile">
						  ${icons.contact}
					  </button>
					  <a class="email-contact gh-button secondary text icon send-email" href="mailto:${item.data.email}" target="_blank">
						  ${icons.email}
					  </a>
					  ${item.meta.primary_phone ? `
					  <a class="gh-button secondary text icon call-primary" href="tel:${item.meta.primary_phone}">
						  ${icons.phone}
					  </a>` : ''}
					  ${item.meta.mobile_phone ? `
					  <a class="gh-button secondary text icon call-mobile" href="tel:${item.meta.mobile_phone}">
						  ${icons.mobile}
					  </a>` : ''}
				  </div>
			  </div>`
        }

        const renderSearchResults = (items = [], search) => {
          if (!items || items.length === 0) {
            //language=HTML
            return `
				<div class="${classPrefix}-results">
					<p>
						${__('No contacts found for the current search', 'groundhogg')}
					</p>
				</div>`
          }

          const viewAllContacts = () => {

            let moreItems = ContactsStore.getTotalItems() - items.length
            //language=HTML
            return `<p style="text-align: center"><a
				href="${adminPageURL('gh_contacts', { s: search })}">${sprintf(_n('See %s more contact', 'See %s more contacts', moreItems), formatNumber(moreItems))}</a>
			</p>`
          }

          //language=HTML
          return `
			  <div class="${classPrefix}-results">
				  ${items.map(item => renderSearchResult(item)).join('')}
				  ${ContactsStore.getTotalItems() > items.length ? viewAllContacts() : ''}
			  </div>`
        }

        let timeout

        $('#quick-search-input').on('change input', ({ target }) => {

          if (timeout) {
            clearTimeout(timeout)
          }

          timeout = setTimeout(() => {

            ContactsStore.fetchItems({
              search: target.value,
              orderby: 'date_created',
              order: 'DESC',
              limit: 5
            }).then(items => {
              mountSearchResults(items, target.value)
            })
          }, 1000)
        }).focus()

      }
    },
    create_contact: {
      cap: 'add_contacts',
      tooltip: `Create a contact`,
      // language=HTML
      svg: icons.createContact,
      view: () => {

        const subClassPrefix = `${classPrefix}-quick-add`

        // language=HTML
        return `
			<div class="gh-rows-and-columns">
				<div class="gh-row">
					<div class="gh-col">
						<label for="${subClassPrefix}-first-name">${__('First Name', 'groundhogg')}</label>
						${input({
							id: `${subClassPrefix}-first-name`,
							name: 'first_name',
							placeholder: 'John'
						})}
					</div>
					<div class="gh-col">
						<label for="${subClassPrefix}-last-name">${__('Last Name', 'groundhogg')}</label>
						${input({
							id: `${subClassPrefix}-last-name`,
							name: 'last_name',
							placeholder: 'Doe'
						})}
					</div>
				</div>
				<div class="gh-row">
					<div class="gh-col">
						<label for="${subClassPrefix}-email">${__('Email Address', 'groundhogg')}</label>
						${input({
							id: `${subClassPrefix}-email`,
							name: 'email',
							placeholder: 'john@example.com',
							required: true,
						})}
					</div>
				</div>
				<div class="gh-row phone">
					<div class="cghol">
						<label for="quick-edit-primary-phone">${__('Primary Phone', 'groundhogg')}</label>
						${input({
							type: 'tel',
							id: `${subClassPrefix}-primary-phone`,
							name: 'primary_phone',
						})}
					</div>
					<div class="primary-phone-ext">
						<label
							for="quick-edit-primary-phone-extension">${_x('Ext.', 'phone number extension', 'groundhogg')}</label>
						${input({
							type: 'number',
							id: `${subClassPrefix}-primary-phone-ext`,
							name: 'primary_phone_extension',
						})}
					</div>
				</div>
				<div class="gh-row">
					<div class="gh-col">
						<label for="quick-edit-mobile-phone">${__('Mobile Phone', 'groundhogg')}</label>
						${input({
							type: 'tel',
							id: `${subClassPrefix}-mobile-phone`,
							name: 'mobile_phone',
						})}
					</div>
				</div>
				<div class="gh-row">
					<div class="gh-col">
						<label for="${subClassPrefix}-tags">${__('Tags', 'groundhogg')}</label>
						${select({
							id: `${subClassPrefix}-tags`,
							multiple: true,
							dataPlaceholder: __('Type to select tags...', 'groundhogg'),
							style: {
								width: '100%'
							}
						})}
					</div>
				</div>
				<div class="gh-row">
					<div class="gh-col">
						<button id="${classPrefix}-quick-add-button" class="gh-button primary">
							${__('Create Contact', 'groundhogg')}
						</button>
					</div>
				</div>
			</div>`
      },
      onMount: () => {

        const subClassPrefix = `${classPrefix}-quick-add`

        let payload = {
          data: {},
          meta: {}
        }

        const setPayload = (data) => {
          payload = {
            ...payload,
            ...data
          }
        }

        $(`#${classPrefix}-quick-add-button`).on('click', ({ target }) => {

          if (!payload.data.email || !isValidEmail(payload.data.email)) {
            errorDialog({
              message: __('A valid email is required!', 'groundhogg')
            })
            return
          }

          $(target).prop('disabled', true)
          const { stop } = loadingDots(`#${classPrefix}-quick-add-button`)
          ContactsStore.post(payload).then(c => {
            stop()
            window.location.href = c.admin
          })
        })

        $(`
        #${subClassPrefix}-first-name, 
        #${subClassPrefix}-last-name, 
        #${subClassPrefix}-email`).on('change input', ({ target }) => {
          setPayload({
            data: {
              ...payload.data,
              [target.name]: target.value
            }
          })
        })

        $(`
        #${subClassPrefix}-primary-phone,
        #${subClassPrefix}-primary-phone-ext,
        #${subClassPrefix}-mobile-phone`).on('change input', ({ target }) => {
          setPayload({
            meta: {
              ...payload.meta,
              [target.name]: target.value
            }
          })
        })

        tagPicker(`#${subClassPrefix}-tags`).on('change', ({ target }) => {
          setPayload({
            tags: $(target).val()
          })
        })

      }
    },
    // send_email: {
    //   tooltip: `Send an email`,
    //   //language=HTML
    //   svg: `
    //   <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    // 	  <path fill="currentColor"
    // 	        d="M467 61H45a45 45 0 00-45 45v300a45 45 0 0045 45h422a45 45 0 0045-45V106a45 45 0 00-45-45zm-6.2 30L257 294.8 51.4 91h409.4zM30 399.8V112l144.5 143.2L30 399.8zM51.2 421l144.6-144.6 50.6 50.3a15 15 0 0021.2 0l49.4-49.5L460.8 421H51.2zM482 399.8L338.2 256 482 112.2v287.6z"/>
    //   </svg>`,
    //   view: () => {
    //     // language=html
    //     return `
    // 	<div class="gh-rows-and-columns">
    // 		<div class="gh-row">
    // 			<div class="gh-col">
    // 				<div class="gh-input-inline-label">
    // 					<label for="subject-line">Subject:</label>
    // 					${inputWithReplacements({
    // 						id: 'subject-line'
    // 					})}
    // 				</div>
    // 			</div>
    // 		</div>
    // 		<div class="gh-row"></div>
    // 	</div>`
    //   },
    //   onMount: () => {},
    // },
    broadcast: {
      cap: 'schedule_broadcasts',
      //language=HTML
      tooltip: `Send a broadcast`,
      svg: icons.megaphone,
      view: () => {
        // language=HTML
        return `
			<div id="send-broadcast"></div>`
      },
      onMount: ({ setTab }) => {
        Groundhogg.SendBroadcast('#send-broadcast', {}, {
          onScheduled: () => {
            setTab('broadcast')
          }
        })
      },
    }
  }

  $(() => {

    const $menuItem = $('#wp-admin-bar-groundhogg')

    let openFlag = false
    let tab = 'search_contacts'

    const close = () => {
      openFlag = false
      $('#groundhogg-toolbar-quick-search').remove()
      $('body').removeClass('groundhogg-toolbar-quick-search-open')
    }

    $menuItem.on('click', (e) => {

      if (openFlag) {
        close()
        return
      }

      openFlag = true

      const { right, bottom } = e.currentTarget.getBoundingClientRect()

      const renderTabs = () => {

        const renderTab = (t, { svg, cap }) => {

          if (!userHasCap(cap)) {
            return ''
          }

          //language=HTML
          return `
			  <button id="gh-tab-${t}" data-tab=${t}
			          class="${classPrefix}-tab-button gh-button text ${tab === t ? 'primary' : 'secondary'} icon">
				  ${svg}
			  </button>`
        }
        //language=HTML
        return `
			<div class="${classPrefix}-tabs">
				${Object.keys(Tabs).map(t => renderTab(t, Tabs[t])).join('')}
			</div>`
      }

      const renderQuickSearch = () => {
        // language=HTML
        return `
			<div id="groundhogg-toolbar-quick-search" class="${classPrefix}" tabindex="0"></div>`
      }

      const mountQuickSearch = () => {

        // language=html
        const html = `
			<button type="button" class="dashicon-button ${classPrefix}-close">
				<span class="dashicons dashicons-no-alt"></span>
			</button>
			${renderTabs()}
			${userHasCap(Tabs[tab].cap) ? Tabs[tab].view() : ''}`

        $quickSearch.html(html)

        const setTab = (t) => {
          tab = t
          mountQuickSearch()
        }

        $(`.${classPrefix}-tab-button`).on('click', ({ currentTarget }) => {
          setTab(currentTarget.dataset.tab)
        })

        Tabs[tab].onMount({ setTab })

        Object.keys(Tabs).forEach(t => tooltip(`#gh-tab-${t}`, {
          content: Tabs[t].tooltip,
          position: 'bottom'
        }))

        $quickSearch.css({
          top: Math.min(bottom, window.innerHeight - $quickSearch.height() - 20),
          left: (right - $quickSearch.outerWidth())
        })

        $(`.${classPrefix}-close`).on('click', () => {
          close()
        })
      }

      const $quickSearch = $(renderQuickSearch())

      $('body').append($quickSearch).addClass('groundhogg-toolbar-quick-search-open')

      $quickSearch.on('keydown', ({ key }) => {
        switch (key) {
          case 'Esc':
          case 'Escape':
            close()
            break
        }
      })

      mountQuickSearch()

    })
  })
})(jQuery)