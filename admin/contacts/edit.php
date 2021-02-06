<?php
namespace Groundhogg\Admin\Contacts;

// Exit if accessed directly
use Groundhogg\Plugin;
use function Groundhogg\current_user_is;
use function Groundhogg\get_request_var;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$id = absint( get_request_var( 'contact' ) );

$contact = Plugin::$instance->utils->get_contact( $id );

if ( ! $contact || ! $contact->exists() ) {
	wp_die( _x( 'This contact has been deleted.', 'contact_record', 'groundhogg' ) );
}

/* Quit if */
if ( current_user_is( 'sales_manager' ) ) {
	if ( $contact->get_owner_id() !== get_current_user_id() ) {
		wp_die( _x( 'You are not the owner of this contact.', 'contact_record', 'groundhogg' ) );
	}
}

?>
<div class="contact-record">
	<div class="contact-editor-wrap">
		<?php include __DIR__ . '/contact-editor.php'; ?>
	</div>
	<div class="contact-info-cards">
		<?php Info_Cards::do_info_cards( $contact ); ?>
	</div>
</div>