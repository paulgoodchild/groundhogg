<?php
namespace Groundhogg\Admin;

use Groundhogg\Plugin;

/**
 * Abstract Admin Page
 *
 * This is a base class for all admin pages
 *
 * @package     Admin
 * @subpackage  Admin
 * @author      Adrian Tobey <info@groundhogg.io>
 * @copyright   Copyright (c) 2018, Groundhogg Inc.
 * @license     https://opensource.org/licenses/GPL-3.0 GNU Public License v3
 * @since       File available since Release 0.1
 */

// Exit if accessed directly
if ( ! defined( 'ABSPATH' ) ) exit;

abstract class Admin_Page
{

    /**
     * Page constructor.
     */
    public function __construct()
    {
        add_action( 'admin_menu', [ $this, 'register' ], $this->get_priority() );

        if ( wp_doing_ajax() && $this->is_ajax_request() ){
            $this->add_ajax_actions();
        }

        if ( $this->is_current_page() ) {

            add_action( 'admin_enqueue_scripts', [ $this, 'scripts' ] );
            add_action( 'init', [ $this, 'process_action' ] );

            $this->add_additional_actions();
        }
    }

    /**
     * Get the parent slug
     *
     * @return string
     */
    protected function get_parent_slug()
    {
        return 'groundhogg';
    }

    /**
     * Add Ajax actions...
     *
     * @return mixed
     */
    abstract protected function add_ajax_actions();

    /**
     * Adds additional actions.
     *
     * @return mixed
     */
    abstract protected function add_additional_actions();

    /**
     * Get the menu order between 1 - 99
     *
     * @return int
     */
    abstract public function get_priority();

    /**
     * Get the page slug
     *
     * @return string
     */
    abstract public function get_slug();

    /**
     * Get the menu name
     *
     * @return string
     */
    abstract public function get_name();

    /**
     * The required minimum capability required to load the page
     *
     * @return string
     */
    abstract public function get_cap();

    /**
     * Get the item type for this page
     *
     * @return mixed
     */
    abstract public function get_item_type();

    /**
     * Whether this page is the current page
     *
     * @return bool
     */
    public function is_current_page()
    {
        // Return basic check to see if we are on the current page doing a normal request
        if ( ! wp_doing_ajax() ){
            return isset( $_GET['page'] ) && $_GET['page'] === $this->get_slug();
        }

        return false;
    }

    /**
     * Whether the current ajax request is coming from the given page.
     *
     * @return bool
     */
    public function is_ajax_request()
    {
        if ( ! wp_doing_ajax() ){
            return false;
        }

        return check_ajax_referer( $this->get_current_action(), '_wpnonce' );
    }

    /**
     * Enqueue any scripts
     */
    abstract public function scripts();

    /* Register the page */
    public function register()
    {
        $page = add_submenu_page(
            $this->get_parent_slug(),
            $this->get_name(),
            $this->get_name(),
            $this->get_cap(),
            $this->get_slug(),
            [ $this, 'page' ]
        );

        add_action( "load-" . $page, [ $this, 'help' ] );
    }

    /**
     * Add any help items
     *
     * @return mixed
     */
    abstract public function help();

    /**
     * Get the affected items on this page
     *
     * @return array|bool
     */
    protected function get_items()
    {
        $items = isset($_REQUEST[ $this->get_item_type() ]) ? $_REQUEST[$this->get_item_type()] : null;

        if (!$items)
            return false;

        return is_array($items) ? $items : array( $items );
    }

    /**
     * Get the current action
     *
     * @return bool|string
     */
    protected function get_current_action()
    {
        if (isset($_REQUEST['filter_action']) && !empty($_REQUEST['filter_action']))
            return false;

        if (isset($_REQUEST['action']) && -1 != $_REQUEST['action'])
            return $_REQUEST['action'];

        if (isset($_REQUEST['action2']) && -1 != $_REQUEST['action2'])
            return $_REQUEST['action2'];

        return 'view';
    }

    /**
     * Get the previous action
     *
     * @return mixed
     */
    protected function get_previous_action()
    {
        $action = get_transient('gh_last_action');

        delete_transient('gh_last_action');

        return $action;
    }

    /**
     * Get the screen title
     */
    protected function get_title()
    {
        return $this->get_name();
    }

    /**
     * Verify that the current user can perform the action
     *
     * @return bool
     */
    protected function verify_action()
    {
        if ( !isset( $_REQUEST['_wpnonce'] ) || ! current_user_can( $this->get_cap() ) )
            return false;

        return wp_verify_nonce($_REQUEST['_wpnonce']) || wp_verify_nonce($_REQUEST['_wpnonce'], $this->get_current_action()) || wp_verify_nonce($_REQUEST['_wpnonce'], sprintf( 'bulk-%ss', $this->get_item_type() ) );
    }

    /**
     * Process the given action
     */
    public function process_action()
    {

        if ( !$this->get_current_action() || !$this->verify_action() )
            return;

        $base_url = remove_query_arg( [ '_wpnonce', 'action' ], wp_get_referer() );

        $func = sprintf( "process_%s", $this->get_current_action() );

        if ( method_exists( $this, $func ) ){
            $exitCode = call_user_func( [ $this, $func ] );
        }

        set_transient('groundhogg_last_action', $this->get_current_action(), 30 );

        if ( is_wp_error( $exitCode ) ){
            $this->add_notice( $exitCode );
            return;
        }

        // Return to self if true response.
        if ( $exitCode === true ){
            return;
        }

        // IF NULL return to main table
        $base_url = add_query_arg('ids', urlencode(implode(',', $this->get_items())), $base_url);

        wp_redirect( $base_url );
        die();
    }

    /**
     * Get an array of links => titles for page title actions
     *
     * @return array[]
     */
    protected function get_title_actions(){
        return [
            [
                'link' => $this->admin_url( [ 'action' => 'add' ] ),
                'action' => __( 'Add New', 'groundhogg' ),
                'target' => '_self',
            ]
        ];
    }

    /**
     * Output the title actions
     */
    protected function do_title_actions()
    {
        foreach ( $this->get_title_actions() as $action ):

            $action = wp_parse_args( $action, [
                'link' => admin_url(),
                'action' => __( 'Add New', 'groundhogg' ),
                'target' => '_self',
            ] )

            ?>
            <a class="page-title-action aria-button-if-js" target="<?php esc_attr_e( $action[ 'target' ] ); ?>" href="<?php esc_attr_e( $action[ 'link' ] ); ?>"><?php _e( $action[ 'action' ] ); ?></a>
        <?php
        endforeach;

    }

    /**
     * Output the basic view.
     *
     * @return mixed
     */
    abstract public function view();


    /**
     * Display the title and dependent action include the appropriate page content
     */
    public function page(){
        ?>
        <div class="wrap">
            <h1 class="wp-heading-inline"><?php echo $this->get_title(); ?></h1>
            <?php $this->do_title_actions(); ?>
            <div id="notices">
                <?php Plugin::instance()->notices->notices(); ?>
            </div>
            <hr class="wp-header-end">
            <?php

            if ( method_exists( $this, $this->get_current_action() ) ){
                call_user_func( [ $this, $this->get_current_action() ] );
            } else {
                do_action( "groundhogg/admin/{$this->get_slug()}/display/{$this->get_current_action()}", $this );
            }

            ?>
        </div>
        <?php
    }

    /**
     * Get the admin url with the given query string.
     *
     * @param string $query_string
     * @return string
     */
    public function admin_url( $query_string = '' )
    {
        $base = admin_url( sprintf( 'admin.php?page=%s', $this->get_slug() ) );

        if ( empty( $query_string ) ){
            return $base;
        }

        if ( is_array( $query_string ) ){
            $query_string = http_build_query( $query_string );
        }

        return sprintf( "%s&%s", $base, $query_string );
    }

    /**
     * Adds an admin notice
     *
     * @param string $code
     * @param string $message
     * @param string $type
     * @param bool $cap
     */
    protected function add_notice( $code='', $message='', $type='success', $cap=false )
    {
        if ( ! $cap ){
            $cap = $this->get_cap();
        }

        Plugin::instance()->notices->add( $code, $message, $type, $cap );
    }

    /**
     * Removes an admin notice
     *
     * @param string $code
     */
    protected function remove_notice( $code='' )
    {
        Plugin::instance()->notices->remove( $code );
    }

    /**
     * Output any notices...
     */
    protected function notices()
    {
        Plugin::instance()->notices->notices();
    }

    /**
     * Send any response data to the given ajax request
     *
     * @param array $data
     * @return bool|void
     */
    protected function send_ajax_response( $data = [] )
    {
        if ( ! wp_doing_ajax() ){
            return;
        }

        if ( ! is_array( $data ) ){
            $data = (array) $data;
        }

        ob_start();

        Plugin::instance()->notices->notices();

        $notices = ob_get_clean();

        $response = [
            'notices' => $notices,
            'data' => $data
        ];

        wp_send_json_success( $response );
    }

}