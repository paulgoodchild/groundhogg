(function ($) {

  const {
    modal,
    select,
    stepNav,
    stepNavHandler,
    input,
    errorDialog,
    setFrameContent,
    progressBar,
    tooltip,
    loadingDots,
    adminPageURL,
    bold,
    dialog
  } = Groundhogg.element
  const { emailPicker, searchesPicker } = Groundhogg.pickers
  const { emails: EmailsStore, searches: SearchesStore, contacts: ContactsStore } = Groundhogg.stores
  const { routes, post } = Groundhogg.api
  const { createFilters } = Groundhogg.filters.functions
  const { formatNumber, formatTime, formatDate, formatDateTime } = Groundhogg.formatting
  const { sprintf, __, _x, _n } = wp.i18n

  const SendBroadcast = (selector, {
    email = false,
    ...rest
  } = {}, {
    onScheduled = () => {}
  }) => {

    let state = {
      email_id: email ? email.ID : false,
      when: 'now',
      which: 'filters',
      query: {},
      total_contacts: 0,
      ...rest
    }

    const setState = (newState) => {
      state = {
        ...state,
        ...newState
      }

      console.log(state)
    }

    const elPrefix = 'gh-broadcast'

    if (email) {
      EmailsStore.itemsFetched([email])
    }

    const step1 = () => {

      const preview = () => {

        // language=HTML
        return `
			<div class="gh-row">
				<div class="gh-col">
					<iframe id="${elPrefix}-email-preview"></iframe>
				</div>
			</div>`
      }

      // language=HTML
      return `
		  <div class="gh-rows-and-columns">
			  <div class="gh-row">
				  <div class="gh-col">
					  <label for="${elPrefix}-email">${__('Which email do you want to send?', 'groundhogg')}</label>
					  ${select({
						  name: 'email',
						  id: `${elPrefix}-email`
					  }, EmailsStore.getItems().map(e => ({ text: e.data.title, value: e.ID })), state.email_id)}
				  </div>
			  </div>
			  ${state.email_id ? preview() : ''}
			  <div class="gh-row">
				  <div class="gh-col">
					  <button class="gh-next-step gh-button primary" ${state.email_id ? '' : 'disabled'}>
						  ${__('Next', 'groundhogg')} &rarr;
					  </button>
				  </div>
			  </div>
		  </div>
      `
    }

    const step2 = () => {

      const laterSettings = () => {
        // language=HTML
        return `
			<div class="gh-row">
				<div class="gh-col">
					<label for="${elPrefix}-date">${__('Set the date and time...', 'groundhogg')}</label>
					<div class="gh-input-group">
						${input({
							id: `${elPrefix}-date`,
							type: 'date',
							name: 'date',
							value: state.date,
							min: moment().format('YYYY-MM-DD')
						})}
						${input({
							id: `${elPrefix}-time`,
							type: 'time',
							name: 'time',
							value: state.time,
						})}
					</div>
				</div>
			</div>`
      }

      // language=HTML
      return `
		  <div class="gh-rows-and-columns">
			  <div class="gh-row">
				  <div class="gh-col">
					  <label for="${elPrefix}-when">${__('When should this email be sent?', 'groundhogg')}</label>
					  <div class="gh-radio-group">
						  <label>${input({
							  type: 'radio',
							  className: 'change-when',
							  name: 'gh_send_when',
							  value: 'now',
							  checked: state.when === 'now',
						  })} ${__('Now', 'groundhogg')}</label>
						  <label>${input({
							  type: 'radio',
							  name: 'gh_send_when',
							  className: 'change-when',
							  value: 'later',
							  checked: state.when === 'later',
						  })} ${__('Later', 'groundhogg')}</label>
					  </div>

				  </div>
			  </div>
			  ${state.when === 'later' ? laterSettings() : ''}
			  <div class="gh-row">
				  <div class="gh-col">
					  <button class="gh-next-step gh-button primary"
					          ${state.when === 'later' && (!state.date || !state.time) ? 'disabled' : ''}>
						  ${__('Next', 'groundhogg')} &rarr;
					  </button>
				  </div>
			  </div>`
    }

    const step3 = () => {

      const { total_contacts } = state

      const totalAndNext = () => {
        //language=HTML
        return `
			<div class="gh-row">
				<div class="gh-col">
					<div id="${elPrefix}-total-contacts">
						<p>
							${sprintf(_n('Send to %s contact', 'Send to %s contacts', total_contacts, 'groundhogg'), bold(formatNumber(total_contacts)))}
            </p>
					</div>
				</div>
			</div>
			<div class="gh-row">
				<div class="gh-col">
					<button class="gh-next-step gh-button primary" ${total_contacts ? '' : 'disabled'}>
						${__('Next', 'groundhogg')}
						&rarr;
					</button>
				</div>
			</div>`
        // language=HTML
      }

      if (state.which === 'from_table') {
        return `<div class="gh-rows-and-columns">${totalAndNext()}</div>`
      }

      // language=HTML
      return `
		  <div class="gh-rows-and-columns">
			  <div class="gh-row">
				  <div class="gh-col">
					  <label
						  for="${elPrefix}-search-which">${__('Select contacts to receive this email...', 'groundhogg')}</label>
					  <div class="gh-radio-group">
						  <label>${input({
							  type: 'radio',
							  className: 'change-search-which',
							  name: 'gh_send_search_which',
							  value: 'filters',
							  checked: state.which === 'filters',
						  })} ${__('Search for Contacts', 'groundhogg')}</label>
						  <label>${input({
							  type: 'radio',
							  name: 'gh_send_search_which',
							  className: 'change-search-which',
							  value: 'searches',
							  checked: state.which === 'searches',
						  })} ${__('Use a Saved Search', 'groundhogg')}</label>
					  </div>
				  </div>
			  </div>
			  <div class="gh-row">
				  <div class="gh-col">
					  <div id="${elPrefix}-search-method">
						  ${state.which === 'searches' ? select({
							  id: `${elPrefix}-search-method-searches`,
							  name: 'searches',
							  dataPlaceholder: __('Please select a saved search...', 'groundhogg')
						  }, SearchesStore.getItems().map(s => ({
							  text: s.name,
							  value: s.id
						  })), state.query.saved_search) : ''}
					  </div>
				  </div>
			  </div>
			  ${totalAndNext()}
		  </div>`
    }

    const step4 = () => {

      const email = EmailsStore.get(state.email_id)

      const {
        total_contacts,
        date,
        time
      } = state

      let review = state.when === 'later'
        ? _n('Send %1$s to %2$s contact on %3$s', 'Send %1$s to %2$s contacts on %3$s', total_contacts, 'groundhogg')
        : _n('Send %1$s to %2$s contact <b>immediately</b>.', 'Send %1$s to %2$s contacts <b>immediately</b>', total_contacts, 'groundhogg')

      // language=HTML
      return `
		  <div class="gh-rows-and-columns">
			  <div class="gh-row">
				  <div class="gh-col">
					  ${sprintf(review, bold(email.data.title), bold(formatNumber(total_contacts)), state.when === 'later' ? bold(formatDateTime(date + ' ' + time)) : '')}
				  </div>
			  </div>
			  <div class="gh-row">
				  <div class="gh-col">
					  <button id="${elPrefix}-confirm" class="gh-button primary">
						  ${state.when === 'later' ? __('Confirm and Schedule', 'groundhogg') : __('Confirm and Send', 'groundhogg')}
					  </button>
				  </div>
			  </div>
		  </div>`
    }

    $(selector).html(`<div id="gh-send-broadcast-form"></div>`)

    const {
      $el,
      nextStep,
      lastStep,
      setStep
    } = stepNavHandler('#gh-send-broadcast-form', {
      currentStep: 0,
      steps: [
        step1,
        step2,
        step3,
        step4
      ],
      showNav: true,
      labels: [
        __('Email', 'groundhogg'),
        __('Schedule', 'groundhogg'),
        __('Contacts', 'groundhogg'),
        __('Review', 'groundhogg')
      ],
      onStepChange: (step, {
        nextStep,
        lastStep,
        setStep
      }) => {

        switch (step) {
          case 0:

            const showFrame = () => {
              if (state.email_id) {
                setFrameContent($(`#${elPrefix}-email-preview`)[0], EmailsStore.get(state.email_id).context.built)
              }
            }

            emailPicker(`#${elPrefix}-email`, false, (items) => {EmailsStore.itemsFetched(items)}, {
              status: 'ready'
            }, {
              placeholder: 'Select an email to send...'
            }).on('change', ({ target }) => {
              setState({
                email_id: parseInt(target.value)
              })
              setStep(0)

              // $('.gh-next-step').prop('disabled', !state.email_id)

              showFrame()
            })

            showFrame()

            break
          case 1:
            $('.change-when').on('change', ({ target }) => {
              setState({
                when: $(target).val()
              })
              setStep(1)
            })

            const updateButton = () => {

              const isValid = state.when === 'now' || moment().isBefore(`${state.date} ${state.time}`)

              $('.gh-next-step').prop('disabled', !isValid)
            }

            $(`#${elPrefix}-date`).on('change', ({ target }) => {
              setState({ date: target.value })
              updateButton()
            })

            $(`#${elPrefix}-time`).on('change', ({ target }) => {
              setState({ time: target.value })
              updateButton()
            })
            break
          case 2:

            const updateTotal = () => {

              const query = {
                ...state.query,
                optin_status: [1, 2, 4, 6]
              }

              ContactsStore.count(query).then(total => {
                $(`#${elPrefix}-total-contacts`).html(`<p>${sprintf(_n('Send to %s contact', 'Send to %s contacts', total, 'groundhogg'), bold(formatNumber(total)))}</p>`)
                $('.gh-next-step').prop('disabled', total === 0)
                setState({
                  total_contacts: total
                })
              })
            }

            $('.change-search-which').on('change', ({ target }) => {
              setState({
                which: $(target).val(),
                query: {}
              })
              setStep(2)
            })

            if (state.which === 'filters') {
              createFilters(`#${elPrefix}-search-method`, state.query.filters, (filters) => {
                setState({
                  query: {
                    filters,
                  }
                })
                updateTotal()
              }).mount()
            } else {
              searchesPicker(`#${elPrefix}-search-method-searches`, (items) => { SearchesStore.itemsFetched(items)}, {}, {
                placeholder: 'Select a saved search...'
              }).on('select2:select', ({ target }) => {
                setState({
                  query: {
                    saved_search: $(target).val(),
                  }
                })
                updateTotal()
              })
            }

            updateTotal()

            break

          case 3:

            $(`#${elPrefix}-confirm`).on('click', () => {

              const {
                query = {},
                total_contacts = 0,
                when = 'now',
                date = '',
                time = '',
                send_in_local_time = false
              } = state

              post(routes.v4.broadcasts, {
                object_id: state.email_id,
                object_type: 'email',
                query,
                date,
                time,
                send_now: when === 'now',
                send_in_local_time
              }).then(r => r.item).then(b => {

                const scheduling = () => {
                  // language=HTML
                  return `
					  <h2 id="broadcast-progress-header">${__('Scheduling', 'groundhogg')}</h2>
					  <div id="broadcast-progress"></div>`
                }

                $('#gh-send-broadcast-form').html(scheduling())

                const { stop: stopDots } = loadingDots('#broadcast-progress-header')
                const { setProgress } = progressBar('#broadcast-progress')

                const schedule = () => {
                  post(`${routes.v4.broadcasts}/${b.ID}/schedule`)
                    .then(({ finished, scheduled }) => {
                      setProgress(scheduled / total_contacts)
                      if (!finished) {
                        schedule()
                      } else {
                        setTimeout(() => {
                          stopDots()
                          dialog({
                            message: __('Broadcast scheduled!', 'groundhogg')
                          })

                          onScheduled()

                        }, 500)
                      }
                    }).catch(() => {
                    errorDialog({
                      message: __('Something went wrong...', 'groundhogg')
                    })
                  })
                }

                schedule()
              }).catch(() => {
                errorDialog({
                  message: __('Something went wrong...', 'groundhogg')
                })
                setStep(3)
              })

            })

            break
        }

        $('.gh-next-step').on('click', nextStep)
      }
    })

  }

  Groundhogg.SendBroadcast = SendBroadcast

  $(() => {
    $('#gh-schedule-broadcast').on('click', (e) => {
      e.preventDefault()

      const { close } = modal({
        content: `<div id="gh-broadcast-form" style="width: 400px"></div>`
      })

      SendBroadcast('#gh-broadcast-form', {}, {
        onScheduled: () => {
          window.location.href = adminPageURL('gh_broadcasts', { status: 'scheduled' })
        }
      })
    })
  })

})(jQuery)