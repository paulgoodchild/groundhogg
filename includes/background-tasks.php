<?php

namespace Groundhogg;

use Groundhogg\Utils\Limits;

class Background_Tasks {

	public function __construct() {
		add_action( 'groundhogg/schedule_pending_broadcast', [ $this, 'schedule_pending_broadcast' ] );
	}

	public static function add( $hook, $args ){
		return wp_schedule_single_event( time(), $hook, $args );
	}

	public static function remove( $hook ){
		return wp_clear_scheduled_hook( $hook );
	}

	/**
	 * Schedules any pending broadcasts
	 */
	public function schedule_pending_broadcast( $broadcast_id ) {

		$broadcast = new Broadcast( $broadcast_id );

		if ( ! $broadcast->exists() || ! $broadcast->is_pending() ) {
			return;
		}

		Limits::start();

		Limits::raise_memory_limit();
		Limits::raise_time_limit( MINUTE_IN_SECONDS );

		while ( ! Limits::limits_exceeded() && $broadcast->is_pending() ) {
			$broadcast->schedule_batch();
			Limits::processed_action();
		}

		if ( $broadcast->is_pending() ){
			$broadcast->schedule();
		}

		Limits::stop();
	}
}