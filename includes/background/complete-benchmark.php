<?php

namespace Groundhogg\Background;

use Groundhogg\Contact_Query;
use Groundhogg\Step;
use function Groundhogg\_nf;
use function Groundhogg\bold_it;
use function Groundhogg\notices;

class Complete_Benchmark extends Task {

	protected array $query;
	protected int $step_id;
	protected int $user_id;
	protected int $batch;
	protected Step $step;

	const BATCH_LIMIT = 100;

	/**
	 * @param int   $step_id
	 * @param array $query
	 * @param int   $batch
	 */
	public function __construct( int $step_id, array $query, int $batch ) {
		$this->step_id = $step_id;
		$this->query   = $query;
		$this->batch   = $batch;
		$this->user_id = get_current_user_id();
	}

	public function can_run() {
		$this->step = new Step( $this->step_id );

		return $this->step->is_active();
	}

	public function process(): bool {

		$offset = $this->batch * self::BATCH_LIMIT;

		$query = new Contact_Query( array_merge( $this->query, [
			'offset'     => $offset,
			'limit'      => self::BATCH_LIMIT,
			'found_rows' => false,
		] ) );

		$contacts = $query->query( null, true );

		// No more contacts to add to the funnel
		if ( empty( $contacts ) ) {
			return true;
		}

		foreach ( $contacts as $contact ) {
			$this->step->benchmark_enqueue( $contact );
		}

		$this->batch ++;

		return false;
	}

	public function __serialize(): array {
		return [
			'step_id' => $this->step_id,
			'query'   => $this->query,
			'batch'   => $this->batch,
			'user_id' => $this->user_id,
		];
	}
}