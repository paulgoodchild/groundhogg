(() => {

  const { currentUser } = Groundhogg

  Groundhogg.user = {
    getCurrentUser: () => {
      return currentUser
    },
    userHasCap: ( cap ) => {
      return currentUser.allcaps[cap] || currentUser.caps[cap]
    }
  }

})()