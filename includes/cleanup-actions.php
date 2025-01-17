<?php

namespace Groundhogg;

use Groundhogg\DB\Query\Table_Query;
use Groundhogg\Utils\DateTimeHelper;

class Cleanup_Actions {

	public function __construct() {
		add_action( 'init', [ $this, 'schedule_event' ] );
		add_filter( 'cron_schedules', [ $this, 'add_cron_schedules' ] );

		add_action( 'groundhogg/cleanup', [ $this, 'fix_unprocessed_events' ] );
		add_action( 'groundhogg/cleanup', [ $this, 'delete_expired_permission_keys' ] );
		add_action( 'groundhogg/cleanup', [ $this, 'purge_email_logs' ] );
	}

	public function add_cron_schedules( $schedules ) {
		if ( ! is_array( $schedules ) ) {
			return $schedules;
		}

		$schedules['every_6_hours'] = array(
			'interval' => HOUR_IN_SECONDS * 6,
			'display'  => _x( '4 Times Daily', 'cron_schedule', 'groundhogg' )
		);

		return $schedules;
	}


	public function schedule_event() {
		if ( wp_next_scheduled( 'groundhogg/cleanup' ) ) {
			return;
		}

		$date = new DateTimeHelper( 'today' );

		wp_schedule_event( $date->getTimestamp(), 'every_6_hours', 'groundhogg/cleanup' );
	}


	/**
	 * Automatically fix events that are not processed
	 *
	 * @return void
	 */
	public function fix_unprocessed_events() {

		$query = new Table_Query( 'event_queue' );
		$query->where()
		      ->in( 'status', [ Event::WAITING, Event::IN_PROGRESS ] ) // Event is waiting or in progress
		      ->notEmpty( 'claim' ) // Claim is not empty, it should either be released or not in the queue anymore
		      ->lessThan( 'time', time() - HOUR_IN_SECONDS ) // older than 1 our seconds
		      ->greaterThanEqualTo( 'time', time() - ( 7 * HOUR_IN_SECONDS ) ); //

		$query->update( [
			'status' => Event::WAITING,
			'claim'  => ''
		] );

	}

	/**
	 * Delete any expired permissions keys
	 *
	 * @return void
	 */
	public function delete_expired_permission_keys() {
		$query = new Table_Query( 'permissions_keys' );
		$query->where()->lessThan( 'expiration_date', Ymd_His() );
		$query->delete();
	}

	/**
	 * Purge old email logs
	 *
	 * @return void
	 */
	public function purge_email_logs() {

		$retention_in_days = get_option( 'gh_email_log_retention' ) ?: 14;
		$date              = new DateTimeHelper( strtotime( $retention_in_days . ' days ago' ) );
		$query             = new Table_Query( 'email_log' );
		$query->where()->lessThan( 'date_sent', $date->ymdhis() );
		$query->delete();
	}
}
