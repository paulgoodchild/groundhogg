(function ($) {

  function init () {
    $('.info-cards-wrap .info-cards-sortables').sortable({
      placeholder: 'sortable-placeholder',
      // connectWith: '.ui-sortable',
      handle: '.gh-panel-header > h2',
      // axis: 'y',
      start: function (e, ui) {
        ui.helper.css('left',
          (ui.item.parent().width() - ui.item.width()) / 2)
        ui.placeholder.height(ui.item.height())
        ui.placeholder.width(ui.item.width())
      },
      stop: saveInfoCardOrder
    })

    $(document).on('click', '.info-cards-wrap .info-card > .gh-panel-header button.toggle-indicator', function (e) {
      $(this).closest('.info-card').toggleClass('closed')
      saveInfoCardOrder()
    })

    $(document).on('click', '.info-cards-wrap .info-card > .gh-panel-header button.panel-handle-order-higher', function (e) {
      $(this).closest('.info-card').insertBefore($(this).closest('.info-card').prev())
      saveInfoCardOrder()
    })

    $(document).on('click', '.info-cards-wrap .info-card > .gh-panel-header button.panel-handle-order-lower', function (e) {
      $(this).closest('.info-card').insertAfter($(this).closest('.info-card').next())
      saveInfoCardOrder()
    })

    $(document).on('click', '.expand-all', function (e) {
      $('.info-card').removeClass('closed')
      saveInfoCardOrder()
    })

    $(document).on('click', '.collapse-all', function (e) {
      $('.info-card').addClass('closed')
      saveInfoCardOrder()
    })

    $(document).on('click', '.view-cards', function (e) {
      $('.info-card-views').toggleClass('hidden')
    })

    $(document).on('change', '.hide-card', function (e) {
      var $checkbox = $(this)
      if ($checkbox.is(':checked')) {
        $('.info-card#' + $checkbox.val()).removeClass('hidden')
      } else {
        $('.info-card#' + $checkbox.val()).addClass('hidden')
      }

      saveInfoCardOrder()
    })
  }

  /**
   * Add a new note
   */
  function saveInfoCardOrder () {

    var $cards = $('.info-cards-wrap .info-card')
    var cardOrder = []
    $cards.each(function (i, card) {
      cardOrder.push({
        id: card.id,
        open: !$(card).hasClass('closed'),
        hidden: $(card).hasClass('hidden'),
      })
    })

    adminAjaxRequest(
      {
        action: 'groundhogg_save_card_order',
        cardOrder: cardOrder
      }
    )
  }

  $(document).on('click', '.ic-section-header', function () {
    $(this).closest('.ic-section').toggleClass('open')
  })


  $(function () {
    init()
  })

})(jQuery)
